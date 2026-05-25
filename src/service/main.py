from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import torch
from sentence_transformers import CrossEncoder
from rank_bm25 import BM25Okapi
from intelligence.understanding import intel
from retrieval.bm25 import searcher
from cognition.metacognition import metacog
from memory.memory_manager import manager
from reasoning.reasoning_engine import reasoner
from stable_baselines3 import PPO
import numpy as np
import os

app = FastAPI(title="Cognitive Intelligence Service")

# Load Reranker Model
reranker_model = CrossEncoder("BAAI/bge-reranker-base")

# Load RL Agent if exists
agent = None
if os.path.exists("models/retrieval_agent.zip"):
    agent = PPO.load("models/retrieval_agent")

class IndexRequest(BaseModel):
    documents: List[str]

class MetaRequest(BaseModel):
    query: str
    context: str
    answer: str

class ReasonRequest(BaseModel):
    query: str
    contexts: List[str]

class RerankRequest(BaseModel):
    query: str
    documents: List[str]
    top_k: Optional[int] = 5

class QueryRequest(BaseModel):
    query: str

@app.get("/health")
async def health():
    return {"status": "healthy", "gpu": torch.cuda.is_available()}

@app.post("/rerank")
async def rerank(request: RerankRequest):
    try:
        # Cross-encoder takes pairs of (query, doc)
        pairs = [[request.query, doc] for doc in request.documents]
        scores = reranker_model.predict(pairs)
        
        # Sort documents by score
        scored_docs = sorted(zip(scores, request.documents), key=lambda x: x[0], reverse=True)
        
        return {
            "results": [{"score": float(s), "content": d} for s, d in scored_docs[:request.top_k]]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/understand")
async def understand_query(request: QueryRequest):
    try:
        analysis = intel.understand(request.query)
        rewritten = intel.rewrite(request.query)
        return {
            "original": request.query,
            "rewritten": rewritten,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/index")
async def index_documents(request: IndexRequest):
    try:
        searcher.fit(request.documents)
        return {"status": "indexed", "count": len(request.documents)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/bm25")
async def search_bm25(request: QueryRequest, top_k: int = 5):
    try:
        results = searcher.search(request.query, top_k)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agent/decide")
async def agent_decide(request: QueryRequest):
    if not agent:
        return {"action": 3, "reason": "No agent trained, defaulting to Hybrid+Rerank"}
    
    # Simple observation: [query_len, 0.5, 0.5, 0.5]
    obs = np.array([min(len(request.query)/100, 1.0), 0.5, 0.5, 0.5], dtype=np.float32)
    action, _states = agent.predict(obs)
    
    strategies = ["Vector", "BM25", "Hybrid", "Hybrid+Rerank"]
    return {"action": int(action), "strategy": strategies[action]}

@app.post("/metacog/evaluate")
async def evaluate_answer(request: MetaRequest):
    try:
        report = await metacog.evaluate(request.query, request.context, request.answer)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/memory/store")
async def store_memory(interaction: Dict[str, Any]):
    try:
        manager.store_episodic(interaction)
        return {"status": "stored"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reason")
async def reason_query(request: ReasonRequest):
    try:
        chain = await reasoner.reason(request.query, request.contexts)
        return chain
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
