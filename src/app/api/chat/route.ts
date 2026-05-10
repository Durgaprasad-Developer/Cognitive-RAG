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
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
