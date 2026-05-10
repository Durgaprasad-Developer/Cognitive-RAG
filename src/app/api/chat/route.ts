import { NextRequest, NextResponse } from "next/server";
import { askQuestion } from "@/lib/rag";

export async function POST(req: NextRequest) {
  try {
    const { query, sessionId } = await req.json();
    
    if (!query || !sessionId) {
      return NextResponse.json({ error: "Query and sessionId are required" }, { status: 400 });
    }

    const result = await askQuestion(query, sessionId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Chat API Error:", error);
    // Extract a more descriptive error message for the UI
    const errorDetail = error.message || "Unknown server error";
    return NextResponse.json({ error: `Backend Error: ${errorDetail}` }, { status: 500 });
  }
}
