# Cognitive RAG: The 🎻 LLM Orchestra (Baseline v1.0) 🧠🏛️

This is the **Production-Hardened Baseline** for Cognitive RAG. It features a fault-tolerant multi-model orchestration layer and session-isolated document intelligence.

## 🌟 Core Baseline Features
*   **🎻 LLM Orchestra**: Automatic fallback routing between **Gemini**, **Groq**, and **OpenRouter**.
*   **🛡️ Fault Tolerance**: 30s/60s circuit breakers and "Smart Search" fallback strategies.
*   **📄 Multi-Session Support**: Metadata-level isolation in Qdrant Cloud. Each upload creates a unique chat world.
*   **🎨 Premium UI**: Manual Theme Toggle (Dark/Light), input locking, and real-time status badges.
*   **🕵️‍♂️ Deep Diagnostics**: Stage-based error tracing ([STAGE 1] to [STAGE 6]).

## 🛠️ Technical Architecture
*   **Frontend**: Next.js 15, React 19, Vanilla CSS (Glassmorphism).
*   **Persistence**: localStorage (Sessions) + Qdrant Cloud (Vectors).
*   **Orchestration**: Provider-Agnostic Abstraction (`lib/llm`).
*   **Embeddings**: Gemini-Embedding-001 (768-dim).

## 🔑 Environment Variables
```env
GOOGLE_API_KEY=      # Primary AI & Embeddings
GROQ_API_KEY=        # Ultra-fast Fallback
OPENROUTER_API_KEY=  # Universal Fallback
QDRANT_URL=          # Vector Store URL
QDRANT_API_KEY=      # Vector Store Key
COLLECTION_NAME=     # notebook_rag
```

## 📜 Development Rules
1.  **Baseline Lock**: The `main` branch is the stable baseline.
2.  **Branching**: All new features must be developed on separate branches (e.g., `cognitive-RAG`).
3.  **Merge Policy**: Only merge to `main` after full local and preview-link verification.

---
**Status**: Stable & Production Ready. 🚀
