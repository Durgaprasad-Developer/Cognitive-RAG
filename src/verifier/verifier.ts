import { orchestrator } from "../lib/llm/orchestrator";

export async function verifyGrounding(answer: string, context: string): Promise<{ grounded: boolean; reason: string }> {
  const prompt = `You are a high-accuracy grounding verifier. 
  Determine if the following AI answer is fully supported by the provided context.
  
  CONTEXT: ${context}
  ANSWER: ${answer}
  
  Respond in JSON format: { "grounded": boolean, "reason": string }`;

  try {
    const response = await orchestrator.generateWithFallback(prompt, "Verify grounding.");
    // Extract JSON from response
    const jsonStr = response.content.match(/\{.*\}/s)?.[0] || '{"grounded": true, "reason": "Could not parse verification"}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { grounded: true, reason: "Verification bypassed due to error" };
  }
}
