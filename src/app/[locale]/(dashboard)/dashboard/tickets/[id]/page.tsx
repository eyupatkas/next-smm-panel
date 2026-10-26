import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { closeTicket, replyTicket } from "@/lib/actions/dashboard-actions";
import { getEffectiveUserId } from "@/lib/get-effective-user";
import { getLocale, getTranslations } from "next-intl/server";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getEffectiveUserId();

  const { id } = await params;

  const ticket = await db.ticket.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      messages: {
        select: {
          id: true,
          message: true,
          isAdmin: true,
          // @ts-ignore
          isAi: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const closeAction = closeTicket.bind(null, ticket.id);

  async function replyTicketAction(formData: FormData) {
    "use server";

    await replyTicket(formData);
  }

  const locale = await getLocale();
  const t = await getTranslations("ticketsPage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("ticketNo", { id: ticket.id.slice(0, 8) })} · {ticket.createdAt.toLocaleString(locale)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={ticket.status === "CLOSED" ? "outline" : "secondary"}>
            {t(`status${ticket.status}` as any) || ticket.status}
          </Badge>
          {ticket.status !== "CLOSED" && (
            <form action={closeAction}>
              <Button type="submit" variant="outline">{t("closeTicket")}</Button>
            </form>
          )}
        </div>
      </div>

      <Card className="border-white/10 shadow-lg">
        <CardHeader className="border-b border-border/40">
          <CardTitle className="text-lg font-bold">{t("chatHistory")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {((ticket as any).messages || []).map((message: any) => {
            const isAi = message.isAi;
            return (
              <div
                key={message.id}
                className={`rounded-2xl border p-4 transition-all relative overflow-hidden ${
                  isAi
                    ? "border-purple-500/30 bg-purple-500/5 shadow-lg shadow-purple-500/5"
                    : message.isAdmin
                      ? "border-violet-500/20 bg-violet-550/[0.03] dark:bg-violet-500/[0.02]"
                      : "border-white/5 bg-white/[0.01]"
                }`}
              >
                {isAi && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-xl" />
                )}
                <div className="mb-2 flex items-center justify-between gap-3 relative z-10">
                  <p className={`text-sm font-semibold flex items-center gap-1.5 ${isAi ? "text-purple-400" : message.isAdmin ? "text-violet-400" : "text-foreground"}`}>
                    {isAi ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        OptiSMM AI Asistanı
                      </>
                    ) : message.isAdmin ? t("supportTeam") : t("you")}
                  </p>
                  <p className="text-xs text-muted-foreground">{message.createdAt.toLocaleString(locale)}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground/90 relative z-10">{message.message}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {ticket.status !== "CLOSED" && (
        <Card className="border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold">{t("sendReply")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={replyTicketAction} className="space-y-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="message"
                rows={5}
                required
                className="flex w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder={t("replyPlaceholder")}
              />
              <Button type="submit" className="px-5 rounded-xl">{t("send")}</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}