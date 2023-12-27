import os
import re
from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
from src.hychat import init_env, get_chain
from src.pdfetch import pdfetch_highlighted
import requests

# app instance
app = Flask(__name__)
cors = CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:*",
                "https://localhost:*",
                "https://dtvki2-production.up.railway.app",
            ]
        }
    },
)

# global variables
QA_CHAIN, QA_MEMORY = None, None
page_numbers_store = {}
curr_doc_number = 0


# routes
# /api/home
@app.route("/api/home", methods=["POST", "GET"])
def home():
    return jsonify({"message": "Hello World"})


def query_chain(question):
    global QA_CHAIN
    global QA_MEMORY
    inputs = {"question": question}
    result = QA_CHAIN.invoke(inputs)
    QA_MEMORY.save_context(inputs, {"answer": result["answer"].content})
    QA_MEMORY.load_memory_variables({})

    answer = result["answer"].content

    sources = []
    for s in result["docs"]:
        source = {}
        source["page_content"] = s.page_content
        source["title"] = s.metadata["title"]
        source["source"] = s.metadata["source"]
        source["date"] = s.metadata["date"]
        sources.append(source)

    return answer, sources


# /api/hychat
@app.route("/api/hychat", methods=["POST"])
def qa():
    # get data from request body
    question = request.json["question"]

    # make query
    result = query_chain(question)

    # return result
    return jsonify(result)


@app.route("/api/pdfetch", methods=["POST"])
def fetch_pdf():
    data = request.json
    url = data.get("url")

    output_pdf, pages_with_text = pdfetch_highlighted(
        url, []
    )  # debug for now, since no highlighting

    page_numbers_store[url] = pages_with_text

    return (
        send_file(output_pdf, download_name="highlighted.pdf", as_attachment=True),
        200,
    )


@app.route("/api/pdfetch-highlights", methods=["POST"])
def get_page_numbers():
    data = request.json
    document_id = request.json["documentId"]
    url = f"https://www.datev.de/dnlexom/help-center/v1/documents/{document_id}/pdf"

    if url in page_numbers_store:
        return jsonify(page_numbers_store[url]), 200
    else:
        return jsonify({}), 404


@app.route("/api/get-tutorial", methods=["POST"])
def get_click_tutorial_url():
    # Define the URL with the document ID

    document_id = request.json["documentId"]
    new_url = f"https://www.datev.de/dnlexom/help-center/v1/documents/{document_id}"

    # Perform the HTTP GET request
    response = requests.get(new_url)
    response.raise_for_status()

    # Extract HTML content from the response
    html_string = response.json().get("content")

    # Define the regular expression for the tutorial URL
    tutorial_reg = re.compile(
        r'<a.*"(https://datev.readyplace.net/public/tutorial/(.*))".*>Klick-Tutorial starten</a>'
    )

    # Search for the match in the HTML content
    match = tutorial_reg.search(html_string)

    # Get the first index if it exists
    if match:
        tutorial_url = match.group(1)
        print("TUTORIAL URL:", tutorial_url)
        return jsonify({"url": tutorial_url}), 200
    else:
        return None, 404


def start_server(debug=False):
    if debug:
        app.run(port=8080, debug=True)
    else:
        from waitress import serve

        serve(app, host="0.0.0.0", port=8080)


if __name__ == "__main__":
    import argparse, sys

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "-debug", help="Whether to run the server in debug mode", action="store_true"
    )

    args = parser.parse_args()

    print(args)

    debug = False

    if (
        "OPENAI_API_KEY" in os.environ
        and "PINECONE_API_KEY" in os.environ
        and "PINECONE_ENV" in os.environ
    ):
        init_env(
            os.environ["OPENAI_API_KEY"],
            os.environ["PINECONE_API_KEY"],
            os.environ["PINECONE_ENV"],
        )
    else:
        print("Running in development mode. Fetching keys from SECRETS")
        try:
            with open("SECRETS.txt", "r") as f:
                keys = f.readlines()
                openai_key = keys[0].strip()
                pinecone_api_key = keys[1].strip()
                pinecone_environment = keys[2].strip()
                init_env(openai_key, pinecone_api_key, pinecone_environment)
        except:
            raise Exception("Could not find SECRETS.txt file for API Keys.")

    QA_CHAIN, QA_MEMORY = get_chain()
    debug = args.debug if args.debug else False
    start_server(debug=debug)
