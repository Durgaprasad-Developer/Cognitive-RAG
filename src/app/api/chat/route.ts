import { NextRequest, NextResponse } from "next/server";
import { askQuestion } from "@/lib/rag";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { query, sessionId } = await req.json();
    
    if (!query || !sessionId) {
      return NextResponse.json({ error: "Missing query or sessionId" }, { status: 400 });
    }

    // For now, we return the full response. 
    // We will implement full SSE streaming in the next step.
    const result = await askQuestion(query, sessionId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
