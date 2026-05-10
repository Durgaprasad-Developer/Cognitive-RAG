import { NextRequest, NextResponse } from "next/server";
import { askQuestion } from "@/lib/rag";

export async function POST(req: NextRequest) {
  try {
    // Stage 0: Body Parsing Check
    let body;
    try {
      body = await req.json();
    } catch (e: any) {
      return NextResponse.json({ error: "[STAGE 0: JSON_PARSE] Invalid request body" }, { status: 400 });
    }

    const { query, sessionId } = body;
    console.log(`💬 Chat API Request: query="${query}", sessionId="${sessionId}"`);
    
    if (!query || !sessionId) {
      return NextResponse.json({ 
        error: `[STAGE 0: VALIDATION] Missing fields. Query: ${!!query}, SessionId: ${!!sessionId}` 
      }, { status: 400 });
    }

    const result = await askQuestion(query, sessionId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Chat API Error:", error);
    const errorDetail = error.message || "Unknown server error";
    return NextResponse.json({ error: `Backend Error: ${errorDetail}` }, { status: 500 });
  }
}
