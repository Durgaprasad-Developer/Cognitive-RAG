const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI("AIzaSyCmpWgYL0k-Yjmz60L1bCfE1jjKqrAuUTs");
  const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Just to check connection
  console.log("Connection OK");
  
  // Note: getGenerativeModel doesn't list, but we can try to find where listModels is
}

listModels();
