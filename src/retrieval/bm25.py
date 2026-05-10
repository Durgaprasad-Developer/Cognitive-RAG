from rank_bm25 import BM25Okapi
import nltk
from typing import List

class BM25Searcher:
    def __init__(self):
        self.bm25 = None
        self.corpus = []

    def fit(self, documents: List[str]):
        # Simple tokenization
        tokenized_corpus = [doc.lower().split(" ") for doc in documents]
        self.corpus = documents
        self.bm25 = BM25Okapi(tokenized_corpus)

    def search(self, query: str, top_k: int = 5):
        if not self.bm25:
            return []
        tokenized_query = query.lower().split(" ")
        scores = self.bm25.get_scores(tokenized_query)
        top_n = np.argsort(scores)[::-1][:top_k]
        
        results = []
        for i in top_n:
            results.append({
                "content": self.corpus[i],
                "score": float(scores[i])
            })
        return results

searcher = BM25Searcher()
