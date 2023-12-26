from langchain.retrievers import PineconeHybridSearchRetriever
from langchain.schema.retriever import BaseRetriever
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from langchain.schema import format_document
from src.templates import DEFAULT_DOCUMENT_PROMPT


class FilteredRetriever(BaseRetriever):
    vectorstore: PineconeHybridSearchRetriever

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ):
        """
        _get_relevant_documents is function of BaseRetriever implemented here

        :param query: String value of the query

        """
        results = self.vectorstore.get_relevant_documents(query=query)
        return [doc for doc in results if doc.metadata["document_type"] != "Neuerungen"]


def combine_documents(
    docs, document_prompt=DEFAULT_DOCUMENT_PROMPT, document_separator="\n\n"
):
    doc_strings = [format_document(doc, document_prompt) for doc in docs]
    return document_separator.join(doc_strings)
