import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    let sessionId = "";
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const body = await req.json();
      sessionId = body.sessionId;
    } else {
      const text = await req.text();
      try {
        const body = JSON.parse(text);
        sessionId = body.sessionId;
      } catch {
        const params = new URLSearchParams(text);
        sessionId = params.get("sessionId") || "";
      }
    }

    if (sessionId) {
      await db.activeSession.deleteMany({
        where: { sessionId },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
