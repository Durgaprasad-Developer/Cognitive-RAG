import { ChatGroq } from "@langchain/groq";
import { BaseLLM } from "./base";

export class GroqProvider extends BaseLLM {
  name = "Groq (Llama 3.3)";
  private model: ChatGroq;

  constructor(apiKey: string) {
    super();
    // Use 'model' instead of 'modelName' for the latest library
    this.model = new ChatGroq({
      model: "llama-3.3-70b-versatile",
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
