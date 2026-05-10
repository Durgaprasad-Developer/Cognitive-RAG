import { ChatOpenAI } from "@langchain/openai";
import { BaseLLM } from "./base";

export class OpenRouterProvider extends BaseLLM {
  name = "OpenRouter (Mistral Large)";
  private model: ChatOpenAI;

  constructor(apiKey: string) {
    super();
    this.model = new ChatOpenAI({
      modelName: "mistralai/mistral-large",
      apiKey,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
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
