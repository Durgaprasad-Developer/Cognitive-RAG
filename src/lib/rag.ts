import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { orchestrator } from "./llm/orchestrator";
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

async function ensureCollection() {
  const url = `${vectorStoreConfig.url}/collections/${vectorStoreConfig.collectionName}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.QDRANT_API_KEY) headers["api-key"] = process.env.QDRANT_API_KEY;

  try {
    const check = await fetch(url, { headers });
    if (check.status === 404) {
      await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          vectors: { size: 768, distance: "Cosine" },
        }),
      });
    }
  } catch (e: any) {
    throw new Error(`[STAGE 4: CLOUD_STORE] Qdrant connection failed: ${e.message}`);
  }
}

export async function processFile(file: Blob, fileName: string, sessionId: string) {
  try {
    await ensureCollection();
    
    let docs;
    try {
      if (fileName.endsWith(".pdf")) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdf(buffer);
        docs = [{ pageContent: data.text, metadata: { source: fileName, sessionId } }];
      } else {
        const text = await file.text();
        docs = [{ pageContent: text, metadata: { source: fileName, sessionId } }];
      }
    } catch (e: any) {
      throw new Error(`[STAGE 2: PDF_PARSE] Failed to extract text: ${e.message}`);
    }

    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const splits = await textSplitter.splitDocuments(docs);
    
    if (splits.length > 0) {
      try {
        await QdrantVectorStore.fromDocuments(splits, embeddings, vectorStoreConfig);
      } catch (e: any) {
        throw new Error(`[STAGE 3: EMBEDDING/STORE] Failed to index vectors: ${e.message}`);
      }
      
      // Verification
      let retries = 3;
      while (retries > 0) {
        try {
          const vs = await QdrantVectorStore.fromExistingCollection(embeddings, vectorStoreConfig);
          const test = await vs.similaritySearch("test", 1, {
            must: [{ key: "metadata.sessionId", match: { value: sessionId } }]
          });
          if (test.length > 0) break;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 2000));
        retries--;
      }
    }
    
    return { success: true, chunks: splits.length };
  } catch (error: any) {
    console.error("Indexing Error:", error);
    throw error;
  }
}

export async function askQuestion(query: string, sessionId: string) {
  try {
    let vectorStore;
    try {
      vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        vectorStoreConfig
      );
    } catch (e: any) {
      throw new Error(`[STAGE 5: RETRIEVAL] Database connection failed: ${e.message}`);
    }

    const results = await vectorStore.similaritySearch(query, 5, {
      must: [{ key: "metadata.sessionId", match: { value: sessionId } }],
    });

    if (results.length === 0) {
      return {
        answer: "I'm sorry, I couldn't find any relevant information for this session. The document might not have indexed correctly.",
        modelUsed: "System",
        sources: []
      };
    }

    const context = results.map(r => r.pageContent).join("\n\n");
    const systemPrompt = `You are an AI assistant helping a user with their document.
    Use the following context to answer: ${context}`;

    try {
      const response = await orchestrator.generateWithFallback(systemPrompt, query);
      return {
        answer: response.content,
        modelUsed: response.modelUsed,
        sources: results.map((doc: any) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
        })),
      };
    } catch (e: any) {
      throw new Error(`[STAGE 6: AI_ORCHESTRA] Failed to generate answer: ${e.message}`);
    }
  } catch (error: any) {
    console.error("RAG Error:", error);
    throw error;
  }
}
