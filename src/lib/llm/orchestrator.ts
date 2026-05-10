import { BaseLLM, LLMResponse } from "./base";
import { GeminiProvider } from "./gemini";
import { GroqProvider } from "./groq";
import { OpenRouterProvider } from "./openrouter";
import { OllamaProvider } from "./ollama";

export class LLMOrchestrator {
  private providers: BaseLLM[] = [];

  constructor() {
    this.initProviders();
  }

  private initProviders() {
    this.providers = [];
    if (process.env.GOOGLE_API_KEY) {
      this.providers.push(new GeminiProvider(process.env.GOOGLE_API_KEY));
    }
    if (process.env.GROQ_API_KEY) {
      this.providers.push(new GroqProvider(process.env.GROQ_API_KEY));
    }
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.push(new OpenRouterProvider(process.env.OPENROUTER_API_KEY));
    }
    // Only add Ollama if we are NOT on Vercel (Local dev)
    if (process.env.NODE_ENV !== "production") {
      this.providers.push(new OllamaProvider());
    }
  }

  async generateWithFallback(systemPrompt: string, userQuery: string): Promise<LLMResponse> {
    // Re-init in case env vars were loaded late
    if (this.providers.length === 0) {
      this.initProviders();
    }

    if (this.providers.length === 0) {
      throw new Error("No AI keys found! Please add GOOGLE_API_KEY or GROQ_API_KEY to your Vercel Environment Variables.");
    }

    let report = "";

    for (const provider of this.providers) {
      try {
        const timeoutMs = provider.name.includes("Local") ? 45000 : 30000;
        
        const response = await Promise.race([
          provider.generate(systemPrompt, userQuery),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`${provider.name} timed out`)), timeoutMs)
          )
        ]);

        if (response) {
          return { content: response, modelUsed: provider.name };
        }
      } catch (error: any) {
        report += `[${provider.name}: ${error.message}] `;
        continue;
      }
    }

    throw new Error(`Orchestra Failure. Reports: ${report}`);
  }
}

export const orchestrator = new LLMOrchestrator();
