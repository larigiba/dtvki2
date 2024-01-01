import psycopg2
from psycopg2 import sql
from src.db import get_connection

# Database connection parameters - replace with your database details
# SQL statement to drop the conversations table
drop_tables = """
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS conversations;
"""

# SQL statements to create tables
create_users_table = """
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(50),
    user_type VARCHAR(50) CHECK (user_type IN ('AI', 'Human'))
);
"""

# insert AI and user zero into users table
insert_users = """
INSERT INTO users (user_name, user_type) VALUES
('AI', 'AI'),
('Zero', 'Human');
"""

create_conversations_table = """
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id SERIAL PRIMARY KEY,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE NULL
);
"""

create_messages_table = """
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    conversation_id INT,
    user_id INT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sequence_number INT,
    content TEXT,
    message_source VARCHAR(50) CHECK (message_source IN ('AI', 'Human')),
    doc_sources TEXT[] NULL,
    doc_titles TEXT[] NULL,
    doc_relevances TEXT[] NULL CHECK (array_length(doc_relevances, 1) = array_length(doc_sources, 1)),
    rating INT NULL,
    note TEXT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
"""

if __name__ == "__main__":
    # get input, either recreate or print all convos
    class bcolors:
        HEADER = "\033[95m"
        OKBLUE = "\033[94m"
        OKCYAN = "\033[96m"
        OKGREEN = "\033[92m"
        WARNING = "\033[93m"
        FAIL = "\033[91m"
        ENDC = "\033[0m"
        BOLD = "\033[1m"
        UNDERLINE = "\033[4m"
        ITALIC = "\x1B[3m"
        ITALIC_END = "\x1B[0m"

    recreate = input(
        "Recreate tables (1), print all conversations (2) or delete one conversation (3)? (1/2/3) "
    )
    if recreate == "1":
        with get_connection() as conn:
            with conn.cursor() as cursor:
                # Create tables
                cursor.execute(drop_tables)
                # conn.commit()
                cursor.execute(create_users_table)
                # conn.commit()
                cursor.execute(create_conversations_table)
                # conn.commit()
                cursor.execute(create_messages_table)
                # conn.commit()
                cursor.execute(insert_users)
                conn.commit()
        print("Tables created successfully.")
    elif recreate == "2":
        # fetch all conversations and all their messages, ordered by sequence_number and save to txt
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT * FROM conversations;
                    """
                )
                conversations = cursor.fetchall()
                for convo in conversations:
                    convo_id = convo[0]
                    cursor.execute(
                        """
                        SELECT * FROM messages WHERE conversation_id = %s ORDER BY sequence_number;
                        """,
                        (convo_id,),
                    )
                    messages = cursor.fetchall()
                    print("-" * 75 + "CONVERSATION WITH ID " + str(convo_id) + "-" * 75)
                    for message in messages:
                        # format datetime into nice format
                        message_datetime = message[3]
                        message_datetime = message_datetime.strftime(
                            "%Y-%m-%d %H:%M:%S"
                        )
                        if message[6] == "AI":
                            print("[AI]")
                        else:
                            print("[Human]")
                        if (
                            message[6] == "AI"
                            and message[7] is not None
                            and len(message[7]) > 0
                        ):
                            # for each source, print id, title and relevance, nicely formatted
                            print(
                                "AI fetched sources with:\n"
                                + "\n".join(
                                    [
                                        "ID: "
                                        + str(doc_id)
                                        + " | Title: "
                                        + str(doc_title)
                                        + " | Relevance: "
                                        + str(doc_relevance)
                                        for doc_id, doc_title, doc_relevance in zip(
                                            message[7], message[8], message[9]
                                        )
                                    ]
                                )
                            )
                        elif (
                            message[6] == "AI"
                            and message[7] is not None
                            and len(message[7]) == 0
                        ):
                            print(
                                f"{bcolors.BOLD}AI did not fetch any sources{bcolors.ENDC}"
                            )
                        rating_as_string = None
                        if message[10] == 1:
                            print(
                                f"{bcolors.OKGREEN}Message was rated as positive {bcolors.ENDC}"
                            )
                        elif message[10] == -1:
                            print(
                                f"{bcolors.FAIL}Message was rated as negative {bcolors.ENDC}"
                            )
                        elif message[6] == "AI":
                            print(f"{bcolors.BOLD}Message was not rated{bcolors.ENDC}")
                        if message[11]:
                            print(
                                f"{bcolors.HEADER}Rating has note: {message[11]}{bcolors.ENDC}"
                            )
                        elif message[6] == "AI":
                            print(
                                f"{bcolors.BOLD}Rating does not have note.{bcolors.ENDC}"
                            )

                        print(
                            str(message[6])
                            + " sent at "
                            + message_datetime
                            + ":\n"
                            + str(message[5])
                            + "\n"
                        )
                        print("- - " * 20)
    elif recreate == "3":
        convo_id = input("Enter conversation id to delete: ")
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM messages WHERE conversation_id = %s;
                    """,
                    (convo_id,),
                )
                cursor.execute(
                    """
                    DELETE FROM conversations WHERE conversation_id = %s;
                    """,
                    (convo_id,),
                )
                conn.commit()
        print("Conversation deleted.")
