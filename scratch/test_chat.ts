import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

async function test() {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    apiKey: "AIzaSyCmpWgYL0k-Yjmz60L1bCfE1jjKqrAuUTs",
  });

  const res = await model.invoke("Hello!");
  console.log(res.content);
}

test();
