import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { orchestrator } from "./llm/orchestrator";
import { HybridRetriever } from "../retrieval/hybrid";
import { verifyGrounding } from "../verifier/verifier";
// @ts-ignore
import pdf from "pdf-extraction";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/gemini-embedding-001",
  apiKey: process.env.GOOGLE_API_KEY,
});

const vectorStoreConfig = {
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: process.env.COLLECTION_NAME || "notebook_rag",
};

export async function processFile(file: Blob, fileName: string, sessionId: string) {
  let docs;
  if (fileName.endsWith(".pdf")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdf(buffer);
    docs = [{ pageContent: data.text, metadata: { source: fileName, sessionId } }];
  } else {
    const text = await file.text();
    docs = [{ pageContent: text, metadata: { source: fileName, sessionId } }];
  }
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const splits = await textSplitter.splitDocuments(docs);
  
  if (splits.length > 0) {
    await QdrantVectorStore.fromDocuments(splits, embeddings, vectorStoreConfig);
    
    // Index in BM25 (Python Service) - Safe call
    try {
      const url = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || "http://localhost:8000";
      await fetch(`${url}/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: splits.map(s => s.pageContent) }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (e) {
      console.warn("⚠️ BM25 Indexing skipped: Service offline or booting.");
    }
  }
  return { success: true, chunks: splits.length };
}

export async function askQuestion(query: string, sessionId: string) {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    vectorStoreConfig
  );

  // 1. Safe RL Agent Strategy Selection
  let strategy = "Vector (Safety Fallback)";
  try {
    const url = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || "http://localhost:8000";
    const agentRes = await fetch(`${url}/agent/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(2000),
    });
    if (agentRes.ok) {
      const agentData = await agentRes.json();
      strategy = agentData.strategy || strategy;
    }
  } catch (e) {
    console.warn("⚠️ RL Agent offline. Using safety fallback strategy.");
  }

  // 2. Adaptive Retrieval (Internally handles safety)
  const retriever = new HybridRetriever(vectorStore);
  const topChunks = await retriever.search(query, sessionId);

  if (!topChunks || topChunks.length === 0) {
    throw new Error("No information found in the document for this query.");
  }

  const context = topChunks.map((c: any) => c.content).join("\n\n");

  const systemPrompt = `You are an Adaptive Cognitive Assistant.
  Answer the user's question using the high-accuracy context below.
  
  Context: ${context}`;

  // 3. Generation
  const response = await orchestrator.generateWithFallback(systemPrompt, query);

  // 4. Safe Hallucination Verification
  let grounded = true;
  let reason = "Verification skipped (Service offline)";
  try {
    const verification = await verifyGrounding(response.content, context);
    grounded = verification.grounded;
    reason = verification.reason;
  } catch (e) {
    console.warn("⚠️ Verification skipped due to service error.");
  }

  return {
    answer: response.content,
    modelUsed: response.modelUsed,
    grounded,
    verificationReason: reason,
    strategyUsed: strategy,
    sources: topChunks.map((c: any) => ({
      content: c.content,
      score: c.score || 0
    })),
  };
}
