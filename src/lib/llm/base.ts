export interface LLMResponse {
  content: string;
  modelUsed: string;
}

export abstract class BaseLLM {
  abstract name: string;
  abstract generate(systemPrompt: string, userQuery: string): Promise<string>;
}
