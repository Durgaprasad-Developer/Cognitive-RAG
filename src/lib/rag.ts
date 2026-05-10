import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
// @ts-ignore
import pdf from "pdf-extraction";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/gemini-embedding-001",
  apiKey: process.env.GOOGLE_API_KEY,
});

const model = new ChatGoogleGenerativeAI({
  model: "models/gemini-flash-latest",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});

const vectorStoreConfig = {
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: process.env.COLLECTION_NAME || "notebook_rag",
};

// Ensure collection exists with correct dimensions
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

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const splits = await textSplitter.splitDocuments(docs);

  if (splits.length > 0) {
    // We add documents with sessionId in metadata
    await QdrantVectorStore.fromDocuments(splits, embeddings, vectorStoreConfig);
  }
  
  return { success: true, chunks: splits.length };
}

export async function askQuestion(query: string, sessionId: string) {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      ...vectorStoreConfig,
      filter: {
        must: [
          {
            key: "metadata.sessionId",
            match: { value: sessionId }
          }
        ]
      }
    }
  );

  const results = await vectorStore.similaritySearch(query, 5);
  const context = results.map(r => r.pageContent).join("\n\n");

  const systemPrompt = `You are an AI assistant helping a user with their document.
  Use the following pieces of retrieved context to answer the question.
  STRICT RULE: ONLY answer based on the provided context. If the answer is not in the context, say "I'm sorry, I couldn't find that information in the uploaded document."
  Do NOT use your general knowledge.

  Context: ${context}`;

  const response = await model.invoke([
    ["system", systemPrompt],
    ["human", query]
  ]);

  return {
    answer: response.content,
    sources: results.map((doc: any) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
    })),
  };
}
