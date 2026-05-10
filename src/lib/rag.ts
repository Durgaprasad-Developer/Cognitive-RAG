import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { QdrantVectorStore } from "@langchain/qdrant";
// @ts-ignore
import pdf from "pdf-extraction";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/gemini-embedding-001",
  apiKey: process.env.GOOGLE_API_KEY,
});

// Primary Brain: Gemini
const primaryModel = new ChatGoogleGenerativeAI({
  model: "models/gemini-flash-latest",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});

// Secondary Brain: Groq (Llama 3.3)
const fallbackModel = process.env.GROQ_API_KEY 
  ? new ChatGroq({
      modelName: "llama-3.3-70b-versatile",
      apiKey: process.env.GROQ_API_KEY,
      temperature: 0,
    })
  : null;

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
  } catch (e) {
    console.error("Error ensuring collection:", e);
  }
}

export async function processFile(file: Blob, fileName: string, sessionId: string) {
  await ensureCollection();
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
  }
  return { success: true, chunks: splits.length };
}

export async function askQuestion(query: string, sessionId: string) {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      ...vectorStoreConfig,
      filter: { must: [{ key: "metadata.sessionId", match: { value: sessionId } }] }
    }
  );

  const results = await vectorStore.similaritySearch(query, 5);
  const context = results.map(r => r.pageContent).join("\n\n");

  const systemPrompt = `You are an AI assistant helping a user with their document.
  Use the following pieces of retrieved context to answer the question.
  STRICT RULE: ONLY answer based on the provided context. If the answer is not in the context, say "I'm sorry, I couldn't find that information in the uploaded document."
  Do NOT use your general knowledge.
  Context: ${context}`;

  let answer;
  let modelUsed = "Gemini 2.0 Flash";

  try {
    const response = await primaryModel.invoke([
      ["system", systemPrompt],
      ["human", query]
    ]);
    answer = response.content;
  } catch (error: any) {
    console.error("Primary model failed, attempting fallback...", error.message);
    
    if (fallbackModel && (error.message.includes("429") || error.message.includes("quota"))) {
      try {
        const response = await fallbackModel.invoke([
          ["system", systemPrompt],
          ["human", query]
        ]);
        answer = response.content;
        modelUsed = "Groq (Llama 3.3)";
      } catch (fallbackError: any) {
        throw new Error(`Orchestra Failure: Both Primary and Fallback failed. Primary Error: ${error.message}`);
      }
    } else {
      throw error;
    }
  }

  return {
    answer,
    modelUsed,
    sources: results.map((doc: any) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
    })),
  };
}
