import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { runChatOrderAgent } from "@/lib/agents/chat-agent";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const visitorId = String(body.visitorId || "").trim();

    if (!message) {
      return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id || null;

    const locale = String(body.locale || "tr").trim();

    const result = await runChatOrderAgent({
      userId,
      message,
      history,
      locale,
    });

    if (visitorId) {
      try {
        let chatSession = await db.aIChatSession.findFirst({
          where: { visitorId },
        });

        if (!chatSession) {
          chatSession = await db.aIChatSession.create({
            data: {
              visitorId,
              userId,
            },
          });
        } else {
          await db.aIChatSession.update({
            where: { id: chatSession.id },
            data: {
              userId: userId || chatSession.userId,
              updatedAt: new Date(),
            },
          });
        }

        await db.aIChatMessage.createMany({
          data: [
            { sessionId: chatSession.id, role: "user", content: message },
            { sessionId: chatSession.id, role: "assistant", content: result.reply },
          ],
        });
      } catch (dbError) {
        console.error("[AI Chat Save Error]:", dbError);
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[AI Order API Route Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "İç sunucu hatası." },
      { status: 500 }
    );
  }
}
