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
      throw new Error(`[STAGE 5: DB_CONNECT] Database connection failed: ${e.message}`);
    }

    let results;
    try {
      // Simplified filter to avoid 400 Bad Request in Qdrant
      results = await vectorStore.similaritySearch(query, 5, {
        must: [
          {
            key: "metadata.sessionId",
            match: { value: sessionId }
          }
        ]
      });
    } catch (e: any) {
      console.error("Similarity Search Error:", e);
      throw new Error(`[STAGE 5.1: VECTOR_SEARCH] Similarity search failed: ${e.message}`);
    }

    if (results.length === 0) {
      return {
        answer: "I'm sorry, I couldn't find any relevant information for this session. Please try re-uploading the document.",
        modelUsed: "System",
        sources: []
      };
    }

    const context = results.map(r => r.pageContent).join("\n\n");
    const systemPrompt = `You are an AI assistant helping a user with their document.
    Use the following pieces of retrieved context to answer the user's question.
    Context: ${context}`;

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
      throw new Error(`[STAGE 6: AI_ORCHESTRA] Generation failed: ${e.message}`);
    }
  } catch (error: any) {
    console.error("AskQuestion Root Error:", error);
    throw error;
  }
}
