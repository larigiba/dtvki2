import os
import psycopg2


def get_connection():
    if (
        "PGDATABASE" in os.environ
        and "PGHOST" in os.environ
        and "PGPASSWORD" in os.environ
        and "PGPORT" in os.environ
        and "PGUSER" in os.environ
    ):
        db_params = {
            "dbname": os.environ["PGDATABASE"],
            "user": os.environ["PGUSER"],
            "password": os.environ["PGPASSWORD"],
            "port": os.environ["PGPORT"],
            "host": os.environ["PGHOST"],
        }
    else:
        print("Running in development mode. Fetching db config from DBSECRETS")
        try:
            with open("DBSECRETS.txt", "r") as f:
                lines = f.readlines()
                db_params = {
                    "dbname": lines[0].strip(),
                    "user": lines[1].strip(),
                    "password": lines[2].strip(),
                    "port": lines[3].strip(),
                    "host": lines[4].strip(),
                }
        except:
            raise Exception("Could not find DBSECRETS.txt file for DB config.")

    return psycopg2.connect(**db_params)


def create_new_conversation():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO conversations (start_time) VALUES (NOW()) RETURNING conversation_id;"
            )
            conversation_id = cur.fetchone()[0]
            conn.commit()
            return conversation_id


def insert_message(
    conversation_id,
    user_id,
    sequence_number,
    content,
    message_source,
    doc_sources=None,
    doc_titles=None,
    doc_relevances=None,
    rating=None,
    note=None,
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO messages (
                    conversation_id,
                    user_id,
                    sequence_number,
                    content,
                    message_source,
                    doc_sources,
                    doc_titles,
                    doc_relevances,
                    rating,
                    note
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    conversation_id,
                    user_id,
                    sequence_number,
                    content,
                    message_source,
                    doc_sources,
                    doc_titles,
                    doc_relevances,
                    rating,
                    note,
                ),
            )
            conn.commit()
