from collections import defaultdict
from datetime import datetime
import os
import re
import uuid
from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
from src.hychat import init_env, get_chain
from src.pdfetch import pdfetch_highlighted
from src.db import create_new_conversation, insert_message, add_feedback_to_message
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
source_content_store = {}
page_numbers_store = {}
curr_doc_number = 0
conversation_id = None
sequence_number = 0
messages = []


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
        source["description"] = s.metadata["description"]
        source["related_products"] = s.metadata["related_products"]
        source["read_duration"] = s.metadata["read_duration"]
        source["record_id"] = s.metadata["record_id"]
        source["date"] = s.metadata["date"]
        source["document_id"] = s.metadata["document_number"]
        source["document_type"] = s.metadata["document_type"]
        source["score"] = s.metadata["score"]
        sources.append(source)

    # filter docs, remove each with score < 11
    sources = [s for s in sources if s["score"] > 11]
    if len(sources) == 0:
        answer = "Leider konnte für Ihre Anfrage kein relevantes Dokument im DATEV-Hilfe-Center gefunden werden. Sehr gerne helfe ich Ihnen bei einer anderen Anfrage weiter."

    # filter if sources with same doc id appear multiple times
    doc_to_sources = defaultdict(list)
    for s in sources:
        doc_to_sources[s["document_id"]].append(s)

    # get max score for each doc and multiply by factor of chunks found in same doc
    filtered_sources = []
    relevance_threshholds = {
        "high relevance": 13,
        "medium relevance": 11,
        "irrelevance": 0,
    }
    for docid, curr_sources in doc_to_sources.items():
        num_highly_relevant_chunks = 0
        num_medium_relevant_chunks = 0
        for s in curr_sources:
            if s["score"] >= relevance_threshholds["high relevance"]:
                num_highly_relevant_chunks += 1
            elif s["score"] >= relevance_threshholds["medium relevance"]:
                num_medium_relevant_chunks += 1
        if num_highly_relevant_chunks > 1 or num_medium_relevant_chunks > 3:
            doc_relevance = "high"
        elif num_medium_relevant_chunks > 1:
            doc_relevance = "medium"
        else:
            doc_relevance = "irrelevant"

        # append chunk with highest relevance for now TODO add all chunks later? for highlighting, or store them
        doc_with_max_score = max(curr_sources, key=lambda x: x["score"])
        doc_with_max_score["relevance"] = doc_relevance
        filtered_sources.append(doc_with_max_score)

    return answer, filtered_sources


# /api/hychat
@app.route("/api/hychat", methods=["POST"])
def qa():
    global sequence_number
    global conversation_id
    if conversation_id is None:
        conversation_id = create_new_conversation()
        print("CREATING NEW CONVERSATION")
        print(conversation_id)
    # get data from request body
    question = request.json["question"]

    insert_message(
        conversation_id,
        2,  # id of user zero
        sequence_number,
        question,
        "Human",
    )
    sequence_number += 1

    # make query
    result = query_chain(question)

    insert_message(
        conversation_id,
        1,  # id of user zero
        sequence_number,
        result[0],
        "AI",
        [s["document_id"] for s in result[1]],
        [s["title"] for s in result[1]],
        [s["relevance"] for s in result[1]],
    )
    sequence_number += 1

    # for each doc id add to sources store
    for doc in result[1]:
        source_content_store[doc["document_id"]] = doc["page_content"]

    # return result
    return jsonify(result)


@app.route("/api/pdfetch", methods=["POST"])
def fetch_pdf():
    data = request.json
    url = data.get("url")
    doc_id = data.get("documentId")

    # DEBUG
    # url = f"https://www.datev.de/dnlexom/help-center/v1/documents/1024621/pdf"
    # DEBUG_SOURCE_CHUNKS = {
    #     5: [
    #         "Ein Arbeitnehmer wird in Lohn und Gehalt neu angelegt. Sie haben hierfür 2 Möglichkeiten:",
    #         " Minijob während Elternzeit",
    #     ],
    #     6: "'2.2 Lohnart einfügen\nDie Energiepreispauschale wird als sonstiger Bezug versteuert und ist beitragsfrei in der Sozialversicherung. \nLohnart für die Energiepreispauschale einfügen\nVorgehen:\n1Mandaten in Lohn und Gehalt öffnen.\n2Mandantendaten | Anpassung Lohnarten | Assistent Lohnarten wählen.\n3DATEV-Standardlohnarten einfügen wählen und auf Weiter klicken.\n4Lohnart 5800 Energiepreispauschale wählen, nach Ausgewählte Lohnarten übernehmen und auf Weiter \nklicken.".split(
    #         "\n"
    #     ),
    #     7: ["2.3 FIBU-Konto für die Energiepreispauschale anlegen\nFür die Erstellu"],
    # }

    # print("-" * 50)
    # print("SOURCE CHUNKS\n\n", source_content_store[doc_id])
    # print("-" * 50)

    output_pdf, pages_with_text = pdfetch_highlighted(
        url, []  # source_content_store[doc_id]
    )  # debug for now, since no highlighting

    page_numbers_store[url] = pages_with_text

    return (
        send_file(output_pdf, download_name="highlighted.pdf", as_attachment=True),
        200,
    )


@app.route("/api/pdfetch-highlights", methods=["POST"])
def get_page_numbers():
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
        return "", 200


# add feedback and note to message
@app.route("/api/add-feedback", methods=["POST"])
def add_feedback():
    global conversation_id
    data = request.json
    message_idx = data.get("messageIdx")
    feedback = data.get("feedback")
    note = data.get("note")

    # update message
    add_feedback_to_message(
        conversation_id,
        message_idx,
        feedback,
        note,
    )

    return jsonify({"message": "success"}), 200


# reset convo
@app.route("/api/reset-convo", methods=["POST"])
def reset_convo():
    global conversation_id
    global sequence_number
    global source_content_store
    global page_numbers_store
    global curr_doc_number
    global messages

    conversation_id = None
    sequence_number = 0
    source_content_store = {}
    page_numbers_store = {}
    curr_doc_number = 0
    messages = []

    return jsonify({"message": "success"}), 200


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
