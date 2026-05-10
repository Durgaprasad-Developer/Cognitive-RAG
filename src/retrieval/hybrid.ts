import { QdrantVectorStore } from "@langchain/qdrant";

export class HybridRetriever {
  constructor(
    private vectorStore: QdrantVectorStore,
    private pythonServiceUrl: string = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || "http://localhost:8000"
  ) {}

  async search(query: string, sessionId: string, topK: number = 10) {
    let searchTerms = query;

    // 1. Safe Query Understanding
    try {
      const intelRes = await fetch(`${this.pythonServiceUrl}/understand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(3000), // 3s timeout
      });
      if (intelRes.ok) {
        const { rewritten } = await intelRes.json();
        searchTerms = rewritten || query;
      }
    } catch (e) {
      console.warn("⚠️ [COGNITION_OFFLINE] Using raw query (Service unreachable)");
    }

    // 2. Search: Vector (Always available) + Optional BM25
    let vectorResults = [];
    let bm25Results = [];

    try {
      const vPromise = this.vectorStore.similaritySearch(searchTerms, topK, {
        must: [{ key: "metadata.sessionId", match: { value: sessionId } }]
      });

      const bPromise = fetch(`${this.pythonServiceUrl}/search/bm25`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerms, top_k: topK }),
        signal: AbortSignal.timeout(3000),
      }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }));

      const [vRes, bRes] = await Promise.all([vPromise, bPromise]);
      vectorResults = vRes;
      bm25Results = bRes.results || [];
    } catch (e) {
      console.error("❌ Vector search failed:", e);
      return [];
    }

    // 3. Combine & Deduplicate
    const combined = new Map<string, string>();
    vectorResults.forEach(r => combined.set(r.pageContent, r.pageContent));
    bm25Results.forEach((r: any) => combined.set(r.content, r.content));

    const uniqueDocs = Array.from(combined.values());

    // 4. Safe Cross-Encoder Reranking
    try {
      const rerankRes = await fetch(`${this.pythonServiceUrl}/rerank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: searchTerms, 
          documents: uniqueDocs,
          top_k: 5 
        }),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (rerankRes.ok) {
        const { results } = await rerankRes.json();
        return results;
      }
    } catch (e) {
      console.warn("⚠️ [RERANK_OFFLINE] Using unranked results");
    }

    // Fallback to top vector results if reranking fails
    return vectorResults.slice(0, 5).map(r => ({ content: r.pageContent, score: 0.5 }));
  }
}
