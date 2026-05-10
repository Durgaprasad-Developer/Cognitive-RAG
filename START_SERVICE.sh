#!/bin/bash
# Adaptive Cognitive RAG - Intelligence Service Starter
echo "🚀 Starting Cognitive Intelligence Service..."
source .venv/bin/activate
uvicorn src.service.main:app --host 0.0.0.0 --port 8000
