from pydantic import BaseModel
from typing import List, Dict, Any
import time

class MemoryLayer(BaseModel):
    id: str
    content: str
    type: str # episodic, semantic, short_term
    timestamp: float

class MemoryManager:
    def __init__(self):
        self.episodic_memory = [] # Key interactions
        self.semantic_memory = {} # Abstracted concepts

    def store_episodic(self, interaction: Dict[str, Any]):
        # Store high-value interactions
        memory = {
            "id": str(time.time()),
            "query": interaction.get("query"),
            "answer": interaction.get("answer"),
            "feedback": interaction.get("feedback"),
            "timestamp": time.time()
        }
        self.episodic_memory.append(memory)
        # Keep only last 100 for now
        if len(self.episodic_memory) > 100:
            self.episodic_memory.pop(0)

    def abstract_semantic(self, key_concept: str, definition: str):
        # Store distilled knowledge
        self.semantic_memory[key_concept.lower()] = {
            "definition": definition,
            "last_seen": time.time()
        }

    def recall(self, query: str):
        # Recall relevant memories for context enhancement
        relevant = []
        for concept, data in self.semantic_memory.items():
            if concept in query.lower():
                relevant.append(data["definition"])
        return relevant

manager = MemoryManager()
