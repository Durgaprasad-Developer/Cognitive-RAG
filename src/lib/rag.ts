import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFParse } from "pdf-parse";

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
    await fetch(url, { method: "DELETE" });
    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vectors: {
          size: 3072,
          distance: "Cosine",
        },
      }),
    });
  } catch (e) {
    console.error("Error clearing collection:", e);
  }
}

export async function processFile(file: Blob, fileName: string) {
  await clearCollection();

  let docs;
  if (fileName.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const parser = new PDFParse({ data: arrayBuffer });
    const result = await parser.getText();
    docs = [{ pageContent: result.text, metadata: { source: fileName } }];
    await parser.destroy();
  } else {
    const text = await file.text();
    docs = [{ pageContent: text, metadata: { source: fileName } }];
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const splits = await textSplitter.splitDocuments(docs);

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
