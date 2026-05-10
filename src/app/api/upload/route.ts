import { NextRequest, NextResponse } from "next/server";
import { processFile } from "@/lib/rag";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob;
    const fileName = formData.get("fileName") as string;
    const sessionId = formData.get("sessionId") as string;

    if (!file || !fileName || !sessionId) {
      return NextResponse.json({ error: "Missing file, fileName, or sessionId" }, { status: 400 });
    }

    const result = await processFile(file, fileName, sessionId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
