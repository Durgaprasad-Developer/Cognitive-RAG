import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseLLM } from "./base";

export class GeminiProvider extends BaseLLM {
  name = "Gemini 2.0 Flash";
  private model: ChatGoogleGenerativeAI;

  constructor(apiKey: string) {
    super();
    this.model = new ChatGoogleGenerativeAI({
      model: "models/gemini-flash-latest",
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
