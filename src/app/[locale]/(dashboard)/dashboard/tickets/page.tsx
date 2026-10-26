import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createTicket } from "@/lib/actions/dashboard-actions";
import { Package2 } from "lucide-react";
import { getEffectiveUserId } from "@/lib/get-effective-user";
import { getLocale, getTranslations } from "next-intl/server";

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "CLOSED") return "outline";
  if (status === "ANSWERED") return "default";
  return "secondary";
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string }>;
}) {
  const userId = await getEffectiveUserId();
  const sp = await searchParams;
  const prefilledOrderId = sp?.orderId ?? "";

  const [tickets, openCount] = await Promise.all([
    db.ticket.findMany({
      where: { userId },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        orderId: true,
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.ticket.count({
      where: { userId, status: { not: "CLOSED" } },
    }),
  ]);

  // Sipariş bilgisi prefill için
  let prefilledOrder: { id: string; service: { name: string } } | null = null;
  if (prefilledOrderId) {
    prefilledOrder = await db.order.findFirst({
      where: { id: prefilledOrderId, userId },
      select: { id: true, service: { select: { name: true } } },
    });
  }

  async function createTicketAction(formData: FormData) {
    "use server";

    await createTicket(formData);
  }

  const locale = await getLocale();
  const t = await getTranslations("ticketsPage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("openTicketsDesc", { count: openCount })}
          </p>
        </div>
        <Badge variant="secondary">{t("totalTickets", { count: tickets.length })}</Badge>
      </div>

      <Card className="border-primary/20 bg-gradient-to-b from-card to-card/60 shadow-xl">
        <CardHeader>
          <CardTitle>{t("newTicket")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTicketAction} className="space-y-4">
            {prefilledOrder && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
                <Package2 size={14} className="text-primary shrink-0" />
                <span className="text-muted-foreground">
                  {t("orderSupportDesc", { id: prefilledOrder.id.slice(0, 8), name: prefilledOrder.service.name })}
                </span>
              </div>
            )}
            <input type="hidden" name="orderId" value={prefilledOrderId} />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">{t("subject")}</label>
                <input
                  id="subject"
                  name="subject"
                  required
                  defaultValue={prefilledOrder ? `Sipariş #${prefilledOrder.id.slice(0, 8)} - ${prefilledOrder.service.name}` : ""}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t("subjectPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="orderIdInput" className="text-sm font-medium">
                  {t("orderNo")} <span className="text-muted-foreground font-normal">{t("optional")}</span>
                </label>
                <input
                  id="orderIdInput"
                  name="orderId"
                  defaultValue={prefilledOrderId}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder="Sipariş ID"
                  readOnly={!!prefilledOrderId}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">{t("message")}</label>
              <textarea
                id="message"
                name="message"
                required
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t("messagePlaceholder")}
              />
            </div>
            <Button type="submit" className="h-11">{t("submit")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("ticketList")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 && (
            <p className="text-muted-foreground">{t("noTickets")}</p>
          )}
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/dashboard/tickets/${ticket.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div>
                <p className="font-semibold">{ticket.subject}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  #{ticket.id.slice(0, 8)} · {ticket._count.messages} mesaj · {ticket.updatedAt.toLocaleDateString(locale)}
                  {ticket.orderId && (
                    <span className="ml-2 inline-flex items-center gap-1 text-primary/80">
                      <Package2 size={11} /> Sipariş #{ticket.orderId.slice(0, 8)}
                    </span>
                  )}
                </p>
              </div>
              <Badge variant={statusVariant(ticket.status)}>{t(`status${ticket.status}` as any) || ticket.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
