from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline
import torch

class QueryIntelligence:
    def __init__(self):
        # Classifier for Intent/Domain
        self.classifier = pipeline(
            "text-classification", 
            model="cross-encoder/ms-marco-MiniLM-L-6-v2", 
            device=0 if torch.cuda.is_available() else -1
        )
        # Rewriter for Retrieval Optimization (Using more robust initialization)
        model_name = "google/flan-t5-small"
        self.rewriter_tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.rewriter_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        if torch.cuda.is_available():
            self.rewriter_model = self.rewriter_model.to("cuda")

    def understand(self, query: str):
        analysis = self.classifier(query)
        return analysis

    def rewrite(self, query: str):
        prompt = f"Rewrite the following query for high-accuracy document retrieval: {query}"
        inputs = self.rewriter_tokenizer(prompt, return_tensors="pt")
        if torch.cuda.is_available():
            inputs = inputs.to("cuda")
        
        outputs = self.rewriter_model.generate(**inputs, max_length=128)
        return self.rewriter_tokenizer.decode(outputs[0], skip_special_tokens=True)

intel = QueryIntelligence()
