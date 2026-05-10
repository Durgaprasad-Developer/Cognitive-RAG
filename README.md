# Cognitive RAG - Google NotebookLM Clone

A full-stack RAG (Retrieval-Augmented Generation) application built with Next.js, LangChain, OpenAI, and Qdrant.

## Features

- **Document Ingestion**: Upload PDF or Text files.
- **Intelligent Chunking**: Splits documents into meaningful chunks using `RecursiveCharacterTextSplitter`.
- **Vector Storage**: Uses Qdrant for fast and efficient retrieval.
- **Grounded Chat**: Answering questions based strictly on the uploaded document context.
- **Premium UI**: Modern, glassmorphic design inspired by NotebookLM.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **RAG Orchestration**: LangChain
- **Embeddings**: OpenAI (`text-embedding-3-large`)
- **LLM**: OpenAI (`gpt-4o-mini`)
- **Vector Database**: Qdrant (Docker)
- **Styling**: Vanilla CSS (Premium Aesthetic)

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Docker (for Qdrant)

### 2. Setup Qdrant

Run Qdrant using Docker:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

### 3. Environment Variables

Create a `.env` file in the root of the project:

```env
OPENAI_API_KEY=your_openai_api_key
QDRANT_URL=http://localhost:6333
COLLECTION_NAME=notebook_rag
```

### 4. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 5. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Implementation Details

- **Chunking Strategy**: Documents are split into 1000-character chunks with a 200-character overlap to preserve context across boundaries.
- **Retrieval**: Uses cosine similarity via Qdrant to retrieve the top 5 most relevant chunks for each query.
- **Grounding**: The system prompt strictly instructs the AI to only use the provided context, preventing hallucinations from its general knowledge.
