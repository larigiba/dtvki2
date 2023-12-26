import re
from flask import Flask, jsonify, send_file
from flask_cors import CORS
from src.hychat import init_env, get_chain
from src.pdfetch import pdfetch_highlighted
import requests

# app instance
app = Flask(__name__)
CORS(app)

# global variables
QA_CHAIN, QA_MEMORY = None, None
page_numbers_store = {}


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
        sources.append(source)

    return answer, sources


# /api/hychat
@app.route("/api/hychat", methods=["POST", "GET"])
def qa():
    # get data from request body
    # question = request.json["question"]

    # make query
    result = query_chain(
        "Wie rechne ich die Energiepreispauschale in Lohn und Gehalt ab?"
    )

    # return result
    return jsonify(result)


# test individually first, then integrate into routine
# so this is actually better!
# yesss
@app.route("/api/pdfetch", methods=["GET"])
def fetch_pdf():
    # data = request.json
    # url = data.get("url")
    # text_chunks = data.get("text_chunks", [])

    url = "https://www.datev.de/dnlexom/help-center/v1/documents/1024621/pdf"
    text_chunks = [
        "2.2 Lohnart einfügen\nDie Energiepreispauschale wird als sonstiger Bezug versteuert und ist beitragsfrei in der Sozialversicherung. \nLohnart für die Energiepreispauschale einfügen\nVorgehen:\n1Mandaten in Lohn und Gehalt öffnen.\n2Mandantendaten | Anpassung Lohnarten | Assistent Lohnarten wählen.\n3DATEV-Standardlohnarten einfügen wählen und auf Weiter klicken.\n4Lohnart 5800 Energiepreispauschale wählen, nach Ausgewählte Lohnarten übernehmen und auf Weiter \nklicken",
        """Damit die Energiepreispauschale nicht automatisch ausgezahlt wird, müssen Sie die Vorbelegungen 
prüfen und ändern. Sie haben hierfür 2 Möglichkeiten:
▪Mandanten in Lohn und Gehalt öffnen: Mandantendaten | Steuer | Allgemeine Daten, Registerkarte 
Lohnsteuer-Anmeldung wählen. Im Feld Auszahlung Energiepreispauschale für Monat Eintrag Keine 
Auszahlung wählen.
- Oder -
▪Mitarbeiter in Lohn und Gehalt öffnen: Stammdaten | Steuer | Besonderheiten, Registerkarte Sonstige 
Angaben wählen.""",
    ]

    output_pdf, pages_with_text = pdfetch_highlighted(url, text_chunks)

    page_numbers_store[url] = pages_with_text

    return (
        send_file(output_pdf, download_name="highlighted.pdf", as_attachment=True),
        200,
    )


@app.route("/api/pdfetch-highlights", methods=["GET"])
def get_page_numbers():
    # data = request.json
    # url = data.get('url')
    url = "https://www.datev.de/dnlexom/help-center/v1/documents/1024621/pdf"

    if url in page_numbers_store:
        return jsonify(page_numbers_store[url]), 200
    else:
        return jsonify({}), 404


@app.route("/api/get-tutorial", methods=["GET"])
def get_click_tutorial_url():
    # Define the URL with the document ID
    document_id = "1024621"  # Replace with your actual document ID
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
    # ----- START SERVER -----
    # get command line argument and see if debug is on
    # if yes, start server in debug mode
    # otherwise, start server in production mode
    # example usage: python server.py debug
    import argparse, sys

    # provide three arguments with argv:
    # openai api key
    # pinecone api key
    # pinecone environment
    parser = argparse.ArgumentParser()

    parser.add_argument("--openai-api-key", help="The OPENAI API key", default=None)
    parser.add_argument("--pinecone-api-key", help="The Pinecone API key", default=None)
    parser.add_argument("--pinecone-env", help="The Pinecone environment", default=None)
    parser.add_argument(
        "-debug", help="Whether to run the server in debug mode", action="store_true"
    )

    args = parser.parse_args()

    print(args)

    openai_key = None
    pinecone_api_key = None
    pinecone_environment = None
    debug = False

    if args.openai_api_key and args.pinecone_api_key and args.pinecone_env:
        init_env(args.openai_api_key, args.pinecone_api_key, args.pinecone_env)
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
