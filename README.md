# 🧠 Cognitive RAG: The Adaptive Reinforcement Learning LLM Orchestra 🎻

[![Next.js](https://img.shields.io/badge/Next.js-16.2-blueviolet?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-emerald?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gymnasium](https://img.shields.io/badge/Gymnasium-0.29-blue?style=for-the-badge)](https://gymnasium.farama.org/)
[![Stable-Baselines3](https://img.shields.io/badge/PPO-SB3-orange?style=for-the-badge)](https://stable-baselines3.readthedocs.io/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Cloud-red?style=for-the-badge&logo=qdrant)](https://qdrant.tech/)
[![Redis](https://img.shields.io/badge/Redis-Cache-crimson?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

**Cognitive RAG** is an advanced, production-hardened retrieval-augmented generation framework. Built using a dual-engine architecture consisting of a **Next.js 16 (React 19)** web layer and a **FastAPI** machine learning service, Cognitive RAG optimizes resource consumption, latency, and response quality dynamically using a **Gymnasium-powered Reinforcement Learning (PPO)** routing agent.

---

## 🌟 Core System Capabilities

*   **🎻 Cascaded LLM Orchestra**: Intelligent fallback provider cascade (Gemini ➔ Groq ➔ OpenRouter ➔ Ollama) that runs racing timeout promises (30s/45s limits) to eliminate API point-of-failure issues.
*   **🧠 RL-Driven Retrieval Routing**: A Gymnasium environment (`RetrievalEnv`) paired with a Stable-Baselines3 PPO agent that learns to select the most optimal retrieval strategy based on query traits, latency, and accuracy needs.
*   **🔍 Multi-Stage Hybrid Ingestion & Retrieval**: Features seq2seq query rewriting (`google/flan-t5-small`), intent classification (`ms-marco-MiniLM`), simultaneous BM25 + Vector retrieval, and neural cross-encoder reranking (`BAAI/bge-reranker-base`).
*   **🏛️ Metacognitive Self-Evaluation**: Self-reflective evaluation (`MetaCognition`) that audits draft answers for confidence, grounding consistency, detail depth, and uncertainty reports, triggering automatic retries when grounding thresholds fail.
*   **💾 Dual-Tier Memory System**: Episodic memory (captures contextual query-answer-feedback interactions) combined with Semantic concept abstraction and Redis caching to boost persistent context recall.
*   **🔒 Multi-Session Tenant Isolation**: Metadata-level isolation inside Qdrant Cloud. Each uploaded document is siloed via session namespaces, preventing cross-tenant information leaks.
*   **🎨 Premium Glassmorphic UI**: Ultra-clean interface with a dark/light system-matching theme toggle, real-time diagnostic status badges, input control locking, and visual source chunk inspectors.

---

## 🏗️ System Architecture & Data Flow

```mermaid
graph TD
    %% User and Web layer
    User([👤 End User]) -->|Uploads PDF / Sends Query| Next[🎨 Next.js 16 Web UI]
    
    subgraph NextJS ["Next.js API Routes (Node.js)"]
        Next -->|/api/upload| UploadRoute[Ingestion & Vectorizer]
        Next -->|/api/chat| ChatRoute[RAG Coordinator]
        ChatRoute -->|1. Decide Strategy| FastAPI_RL[/agent/decide]
        ChatRoute -->|2. Search & Rank| FastAPI_Search[/understand & /search & /rerank]
        ChatRoute -->|3. Fallback Cascade| LLM_Orch{🎻 LLM Orchestra}
        ChatRoute -->|4. Verify| FastAPI_Meta[/metacog/evaluate]
    end

    subgraph FastAPI ["FastAPI ML Service (Python)"]
        FastAPI_RL --> PPO_Agent[🧠 trained PPO Agent]
        PPO_Agent --> RetrievalEnv[Gymnasium RetrievalEnv]
        FastAPI_Search --> Q_Intel[transformers seq2seq & classifier]
        FastAPI_Search --> BM25_Engine[BM25Okapi Indexer]
        FastAPI_Search --> Cross_Encoder[neural Cross-Encoder Reranker]
        FastAPI_Meta --> Metacog_Engine[Metacognition Assessor]
    end

    %% Storage layers
    UploadRoute -->|Metadata-Isolated Writes| Qdrant[(🏛️ Qdrant Cloud Vector DB)]
    ChatRoute -->|Similarity Search| Qdrant
    ChatRoute -->|Fast Session Cache| Redis[(💾 Redis Cache)]

    %% Orchestrator Outputs
    LLM_Orch -->|Provider Cascade| Gemini[Gemini-Pro / Flash]
    LLM_Orch -->|Failover| Groq[Groq Llama-3]
    LLM_Orch -->|Failover| OpenRouter[Universal Gateway]
    LLM_Orch -->|Local Dev| Ollama[Local Ollama Models]
```

---

## 📂 Repository Layout

```filepath
├── src/
│   ├── app/                      # Next.js 16 Client & Server Routes
│   │   ├── api/                  
│   │   │   ├── chat/             # Chat execution handler
│   │   │   └── upload/           # File ingestion & parsing route
│   │   ├── globals.css           # Premium vanilla CSS styling system
│   │   ├── layout.tsx            # Global HTML document shell
│   │   └── page.tsx              # Interactive Workspace UI
│   ├── cognition/                
│   │   └── metacognition.py      # Python grounding audit & self-reflection engine
│   ├── intelligence/             
│   │   └── understanding.py      # Seq2Seq query rewriter & intent classifier
│   ├── lib/                      
│   │   ├── llm/                  # Multi-provider cascade (Gemini, Groq, OpenRouter, Ollama)
│   │   └── rag.ts                # Orchestrator combining RL, Hybrid Search, and Verification
│   ├── memory/                   
│   │   ├── memory_manager.py     # Python episodic and semantic memory managers
│   │   └── redis.ts              # TS Redis session cache layer
│   ├── reasoning/                
│   │   └── reasoning_engine.py   # Multi-pass Chain-of-Thought (CoT) simulation
│   ├── retrieval/                
│   │   ├── bm25.py               # BM25Okapi document indexer & retriever
│   │   └── hybrid.ts             # Combined vector + BM25 TS client
│   ├── rl/                       
│   │   ├── environment.py        # Gymnasium-based RAG Strategy Router Environment
│   │   └── train.py              # Stable-Baselines3 PPO training script
│   ├── service/                  
│   │   └── main.py               # FastAPI ML endpoints & model loaders
│   └── verifier/                 
│       ├── verifier.py           # Grounding schema models
│       └── verifier.ts           # Grounding verification client
├── START_SERVICE.sh              # FastAPI Service bootstrapper
└── package.json                  # Next.js dependencies
```

---

## 🧠 Deep Tech Spotlight

### 1. Dynamic RL-Driven Routing (`RetrievalEnv`)
A standard hybrid RAG environment blindly executes all retrieval passes (Vector, BM25, and neural rerankers) for every single query, incurring massive latencies and server costs. Cognitive RAG solves this using a reinforcement learning agent.

*   **Observation Space (`gymnasium.spaces.Box`)**: A 4-dimensional tensor:
    `[query_length, retrieval_confidence, latency, rerank_score]`
*   **Action Space (`gymnasium.spaces.Discrete(4)`)**:
    *   `0`: Vector Retrieval Only (low-cost, semantic)
    *   `1`: BM25 Retrieval Only (low-cost, keyword-exact)
    *   `2`: Hybrid Search (moderate cost)
    *   `3`: Hybrid Search + Neural Reranking (highest-accuracy, higher-latency)
*   **Reward Function**: Balanced score encouraging accuracy (Hybrid+Rerank) while punishing excessive execution latencies on simple, trivial queries.

### 2. Multi-Provider Fallover Orchestra (`lib/llm`)
The orchestration layer contains automatic fault-handling code. If a provider throws an authentication exception, hits a rate limit, or fails to respond within a custom time-frame, it falls back instantly to the next in sequence:

$$\text{Gemini-Pro/Flash} \xrightarrow{\text{fallback (30s)}} \text{Groq Llama} \xrightarrow{\text{fallback (30s)}} \text{OpenRouter} \xrightarrow{\text{local fallback}} \text{Local Ollama}$$

---

## 🛠️ Installation & Setup

### 1. Configure the Environment
Create a `.env` file in the root directory:

```env
# AI & Foundation Models API Keys
GOOGLE_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
OPENROUTER_API_KEY=your_openrouter_key_here

# Vector Store Connection (Qdrant)
QDRANT_URL=https://your-qdrant-instance.aws.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key_here
COLLECTION_NAME=notebook_rag

# Memory & Cache (Redis)
REDIS_URL=redis://localhost:6379

# Microservices Config
NEXT_PUBLIC_PYTHON_SERVICE_URL=http://localhost:8000
```

### 2. Set Up the FastAPI ML Service
Requires Python 3.10+ and a virtual environment.

```bash
# Initialize and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies (Stable-Baselines3, Gymnasium, Torch, Transformers, FastAPI, NLTK)
pip install fastapi uvicorn torch sentence-transformers rank-bm25 stable-baselines3 gymnasium pydantic numpy nltk

# Train the RL retrieval agent
python src/rl/train.py

# Boot the service
./START_SERVICE.sh
```

### 3. Set Up the Next.js Web Client
```bash
# Install NPM packages
npm install

# Start the Next.js dev server
npm run dev
```
Open `http://localhost:3000` to interact with the premium UI dashboard.

---

## 🕵️‍♂️ Diagnostic Pipeline Matrix

Cognitive RAG uses step-based error boundaries to isolate failures. Below is the diagnostic matrix:

| Stage ID | Source | Meaning | Resolution |
| :--- | :--- | :--- | :--- |
| **`[STAGE 0]`** | Pre-Check | Input or uploaded file violates baseline constraints (e.g. exceeds 4.5MB). | Compress file or clean up query before attempting ingestion. |
| **`[STAGE 1]`** | Network Layer | Next.js API server cannot establish connection with the FastAPI backend. | Ensure the FastAPI service is running (`./START_SERVICE.sh` on port 8000). |
| **`[STAGE 2]`** | Vector Store | Qdrant write or read failed (e.g., incorrect API keys or collection configuration). | Verify `QDRANT_URL` and `QDRANT_API_KEY` in your `.env`. |
| **`[STAGE 3]`** | RL Strategy | RL Router was unable to recommend an action. | Python server default fallback of Hybrid+Rerank handles this automatically. |
| **`[STAGE 4]`** | Orchestra | LLM Orchestrator failed all providers (Gemini, Groq, OpenRouter). | Check console logs to see which API tokens are missing or rate-limited. |
| **`[STAGE 5]`** | Verification | Answer generated successfully, but the Metacognitive auditor flagged a hallucination. | Check source chunks; review if context was too sparse or if query rewriting was off. |
| **`[STAGE 6]`** | Memory Persistence | Interactions could not be stored in Redis or episodic logs. | Ensure local/remote Redis server is booted and accessible via `REDIS_URL`. |

---

## 📜 Development Guidelines

1.  **Baseline Freeze**: The `main` branch is our production-hardened baseline. 
2.  **Branching Policy**: Develop all new features (such as custom routing agents or advanced UI themes) on separate dedicated branches.
3.  **Local Testing**: Always confirm that the ML backend is online (`GET /health` returning `healthy`) before testing Next.js chat interactions.
