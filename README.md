# Cognitive RAG 🧠🎻

A high-performance, fault-tolerant RAG application built for grounded document intelligence.

## 🌟 Key Features

### 🎻 Multi-Model LLM Orchestra
*   **Intelligent Fallback**: Automatically switches between **Gemini 2.0**, **Groq (Llama 3.3)**, and **OpenRouter** if a rate limit or timeout occurs.
*   **Local Fail-Safe**: Integrated with **Ollama** for internet-independent retrieval when running locally.
*   **Automatic Timeouts**: 15s/30s circuit breakers ensure the agent never hangs.

### 📄 Document Intelligence
*   **Multi-PDF Support**: Isolated chat sessions for multiple documents. Switch between your investment plans and resumes instantly.
*   **Perfect Grounding**: Strict system prompts ensure the AI only answers based on your uploaded data.
*   **Smart Chunking**: Powered by LangChain's Recursive Splitter for high-context retrieval.

### 🎨 Premium UX/UI
*   **Glassmorphism Design**: Sleek, modern interface with dark-mode support.
*   **Real-Time Status**: Granular status indicators (Searching, Thinking, Generating) with model provenance badges.
*   **Persistence**: Session history is saved in `localStorage`, so your chats are ready whenever you refresh.
*   **Markdown Support**: Beautiful rendering for bold text, lists, and tables.

## 🛠️ Tech Stack
*   **Frontend**: Next.js 15, React 19, Vanilla CSS
*   **Orchestration**: LangChain, Groq, OpenRouter, Google Generative AI
*   **Vector DB**: Qdrant Cloud
*   **Embeddings**: Gemini-Embedding-001

## 🔑 Environment Setup
Create a `.env` file with the following:
```env
GOOGLE_API_KEY=your_key
GROQ_API_KEY=your_key
OPENROUTER_API_KEY=your_key
QDRANT_URL=your_url
QDRANT_API_KEY=your_key
COLLECTION_NAME=notebook_rag
```

## 🚀 Getting Started
1. `npm install`
2. `npm run dev`
3. Upload your first PDF and start investigating!
