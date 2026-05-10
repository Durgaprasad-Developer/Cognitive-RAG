import { NextRequest, NextResponse } from "next/server";
import { askQuestion } from "@/lib/rag";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    const result = await askQuestion(query);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
