import { ChatOllama } from "@langchain/ollama";
import { BaseLLM } from "./base";

export class OllamaProvider extends BaseLLM {
  name = "Local Ollama (Mistral)";
  private model: ChatOllama;

  constructor() {
    super();
    this.model = new ChatOllama({
      model: "mistral",
      baseUrl: "http://localhost:11434",
      temperature: 0,
    });
  }

  async generate(systemPrompt: string, userQuery: string): Promise<string> {
    const response = await this.model.invoke([
      ["system", systemPrompt],
      ["human", userQuery],
    ]);
    return response.content as string;
  }
}
