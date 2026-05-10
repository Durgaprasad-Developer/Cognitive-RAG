import { ChatGroq } from "@langchain/groq";
import { BaseLLM } from "./base";

export class GroqProvider extends BaseLLM {
  name = "Groq (Llama 3.3)";
  private model: ChatGroq;

  constructor(apiKey: string) {
    super();
    this.model = new ChatGroq({
      modelName: "llama-3.3-70b-versatile",
      apiKey,
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
