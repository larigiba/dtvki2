from flask import Flask, jsonify
from flask_cors import CORS

# from src.hychat import get_chain

# app instance
app = Flask(__name__)
CORS(app)


# routes
# /api/home
@app.route("/api/home", methods=["POST", "GET"])
def home():
    return jsonify({"message": "Hello World"})


# /api/qa
# @app.route("/api/qa", methods=["POST"])
# def qa(request):
#     # get question and context from request body
#     question = request.json["question"]

#     # make query
#     result = make_hybrid_query(qa_chain, question)  # , context, chat_history)

#     # return result
#     return jsonify(result)


# def make_hybrid_query(qa_chain, question, context):
#     result = qa_chain({"question": question, "context": context})
#     return result


def start_server(debug=False):
    if debug:
        app.run(port=8080, debug=True)
    else:
        from waitress import serve

        serve(app, host="0.0.0.0", port=8080)


if __name__ == "__main__":
    # ----- PREPARATION -----
    # qa_chain = get_chain()

    # ----- START SERVER -----
    # get command line argument and see if debug is on
    # if yes, start server in debug mode
    # otherwise, start server in production mode
    # example usage: python server.py debug
    import sys

    debug = False
    if len(sys.argv) > 1:
        if sys.argv[1] == "debug":
            debug = True
    start_server(debug=debug)
