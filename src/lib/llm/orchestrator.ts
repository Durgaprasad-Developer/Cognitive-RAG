import { BaseLLM, LLMResponse } from "./base";
import { GeminiProvider } from "./gemini";
import { GroqProvider } from "./groq";
import { OpenRouterProvider } from "./openrouter";

export class LLMOrchestrator {
  private providers: BaseLLM[] = [];

  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      this.providers.push(new GeminiProvider(process.env.GOOGLE_API_KEY));
    }
    if (process.env.GROQ_API_KEY) {
      this.providers.push(new GroqProvider(process.env.GROQ_API_KEY));
    }
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.push(new OpenRouterProvider(process.env.OPENROUTER_API_KEY));
    }
  }

  async generateWithFallback(systemPrompt: string, userQuery: string): Promise<LLMResponse> {
    if (this.providers.length === 0) {
      throw new Error("No LLM providers configured. Please check your .env file.");
    }

    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        console.log(`🎻 Orchestrator: Attempting ${provider.name}...`);
        
        // Timeout logic: 15 seconds per provider
        const response = await Promise.race([
          provider.generate(systemPrompt, userQuery),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`${provider.name} timed out after 15s`)), 15000)
          )
        ]);

        if (response) {
          return {
            content: response,
            modelUsed: provider.name
          };
        }
      } catch (error: any) {
        console.error(`❌ ${provider.name} failed:`, error.message);
        lastError = error;
        continue; // Try next provider
      }
    }

    throw new Error(`Orchestra Failure: All providers failed. Last Error: ${lastError?.message}`);
  }
}

export const orchestrator = new LLMOrchestrator();
