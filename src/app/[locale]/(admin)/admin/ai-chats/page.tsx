import { db } from "@/lib/db";
import AIChatsClient from "@/components/admin/AIChatsClient";

export default async function Page() {
  const sessions = await db.aIChatSession.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const mappedSessions = sessions.map((s) => ({
    id: s.id,
    visitorId: s.visitorId,
    userId: s.userId,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    user: s.user,
    messages: s.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yapay Zeka Sohbet İzleme</h1>
        <p className="text-sm text-muted-foreground">
          Ziyaretçilerin ve üyelerin yapay zeka sipariş asistanı ile yaptığı tüm konuşmaları canlı takip edin.
        </p>
      </div>

      <AIChatsClient sessions={mappedSessions} />
    </div>
  );
}
