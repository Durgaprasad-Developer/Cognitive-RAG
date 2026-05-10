import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import pdf from "pdf-parse";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GOOGLE_API_KEY,
});

const model = new ChatGoogleGenerativeAI({
  model: "gemini-flash-latest",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});

const vectorStoreConfig = {
  url: process.env.QDRANT_URL || "http://localhost:6333",
  collectionName: process.env.COLLECTION_NAME || "notebook_rag",
};

async function clearCollection() {
  const url = `${vectorStoreConfig.url}/collections/${vectorStoreConfig.collectionName}`;
  try {
    // Delete if exists
    await fetch(url, { method: "DELETE" });
    // Recreate
    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vectors: {
          size: 768, // gemini-embedding-001 size
          distance: "Cosine",
        },
      }),
    });
  } catch (e) {
    console.error("Error clearing collection:", e);
  }
}

export async function processFile(file: Blob, fileName: string) {
  // 1. Clear previous data
  await clearCollection();

  // 2. Load document
  let docs;
  if (fileName.endsWith(".pdf")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdf(buffer);
    docs = [{ pageContent: data.text, metadata: { source: fileName } }];
  } else {
    const text = await file.text();
    docs = [{ pageContent: text, metadata: { source: fileName } }];
  }

  // 3. Chunking
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const splits = await textSplitter.splitDocuments(docs);

  // 4. Embedding & Indexing
  await QdrantVectorStore.fromDocuments(splits, embeddings, vectorStoreConfig);
  
  return { success: true, chunks: splits.length };
}

export async function askQuestion(query: string) {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    vectorStoreConfig
  );

  const results = await vectorStore.similaritySearch(query, 5);
  const context = results.map(r => r.pageContent).join("\n\n");

  const systemPrompt = `You are an AI assistant helping a user with their document.
  Use the following pieces of retrieved context to answer the question.
  STRICT RULE: ONLY answer based on the provided context. If the answer is not in the context, say "I'm sorry, I couldn't find that information in the uploaded document."
  Do NOT use your general knowledge.
  Identify specifically where in the document the information comes from if possible.

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
