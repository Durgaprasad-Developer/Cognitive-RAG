const { GoogleGenerativeAI } = require("@google/generative-ai");

async function list() {
  try {
    const genAI = new GoogleGenerativeAI("AIzaSyCmpWgYL0k-Yjmz60L1bCfE1jjKqrAuUTs");
    // Unfortunately, the JS SDK doesn't have a simple listModels method in the main entry point.
    // It's usually in the admin or via a direct fetch.
    
    // Let's try to just fetch one that SHOULD exist.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}

list();
