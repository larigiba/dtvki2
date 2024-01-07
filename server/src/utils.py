from langchain.retrievers import PineconeHybridSearchRetriever
from langchain.schema.retriever import BaseRetriever
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from langchain.schema import format_document
from src.templates import DEFAULT_DOCUMENT_PROMPT
from langchain_core.documents import Document
from typing import List


def overrides(interface_class):
    def overrider(method):
        assert method.__name__ in dir(interface_class)
        return method

    return overrider


class PineconeHybridSearchRetrieverWithScores(PineconeHybridSearchRetriever):
    @overrides(PineconeHybridSearchRetriever)
    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        from pinecone_text.hybrid import hybrid_convex_scale

        sparse_vec = self.sparse_encoder.encode_queries(query)
        # convert the question into a dense vector
        dense_vec = self.embeddings.embed_query(query)
        # scale alpha with hybrid_scale
        dense_vec, sparse_vec = hybrid_convex_scale(dense_vec, sparse_vec, self.alpha)
        sparse_vec["values"] = [float(s1) for s1 in sparse_vec["values"]]
        # query pinecone with the query parameters
        result = self.index.query(
            vector=dense_vec,
            sparse_vector=sparse_vec,
            top_k=10,
            include_metadata=True,
            namespace=self.namespace,
        )
        final_result = []
        for res in result["matches"]:
            context = res["metadata"].pop("context")
            metadata = {**res["metadata"], **{"score": res["score"]}}
            final_result.append(Document(page_content=context, metadata=metadata))
        # return search results as json
        return final_result


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
