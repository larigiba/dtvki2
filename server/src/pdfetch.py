import requests
from io import BytesIO
import requests
import fitz  # PyMuPDF
from io import BytesIO


# def split_and_combine_text(text, chunk_size):
#     # Split text by line breaks
#     initial_chunks = text.split("\n")

#     combined_chunks = []
#     current_chunk = ""

#     for chunk in initial_chunks:
#         if not current_chunk:
#             # Start a new chunk if the current is empty
#             current_chunk = chunk
#         elif len(current_chunk) + len(chunk) + 1 <= chunk_size:
#             # Combine chunks with a line break, if the size allows
#             current_chunk += "\n" + chunk
#         else:
#             # Add the current chunk to the list and start a new one
#             combined_chunks.append(current_chunk)
#             current_chunk = chunk

#     # Add the last chunk if it's not empty
#     if current_chunk:
#         combined_chunks.append(current_chunk)

#     return combined_chunks


def pdfetch_highlighted(url, text_chunks):
    if not url:
        return "URL is required.", 400

    try:
        response = requests.get(url)
        response.raise_for_status()

        if "application/pdf" not in response.headers.get("Content-Type", ""):
            return "URL does not contain a PDF.", 400

        pdf_file = BytesIO(response.content)
        pdfIn = fitz.open(stream=pdf_file, filetype="pdf")

        # pages_with_text = {}

        for page in pdfIn:
            page_number = page.number + 1  # PyMuPDF page numbers start at 0
            # print(page)

            if page_number not in text_chunks:
                continue
            curr_text_chunks = text_chunks[page_number]
            # print("PAGE NUMBER", page_number, "TEXT CHUNKS", curr_text_chunks)
            # print(text_chunks)
            # print([len(chunk) for chunk in text_chunks])
            # fixed_text_chunks = []
            # for chunk in text_chunks:
            #     fixed_text_chunks.extend(split_and_combine_text(chunk, 100))

            # print(fixed_text_chunks)
            text_instances = [page.search_for(text) for text in curr_text_chunks]

            # print("TEXT INSTANCES")
            # print(text_instances)

            for text, instances in zip(text_chunks, text_instances):
                for inst in instances:
                    page.add_highlight_annot(inst)
                    # Create a named link at the highlight location
                    # The link destination can be adjusted as needed
                    # link_dest = fitz.Link(page.number, fitz.Point(0, 0))
                    # page.insert_link(
                    #     link_dest, text=text
                    # )  # 'text' will be the link's name
                    # print("CUSTOM LINK TEXT", text)

                    # if text not in pages_with_text:
                    #     pages_with_text[text] = []
                    # if page_number not in pages_with_text[text]:
                    #     pages_with_text[text].append(page_number)

        output_pdf = BytesIO()
        pdfIn.save(output_pdf)
        output_pdf.seek(0)

        return output_pdf, None  # , pages_with_text

    except requests.RequestException as e:
        return str(e), 500
