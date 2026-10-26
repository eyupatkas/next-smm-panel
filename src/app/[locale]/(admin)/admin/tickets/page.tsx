import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, CheckCircle, XCircle, ChevronRight, Package } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  OPEN: { label: "Açık", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <MessageSquare size={12} /> },
  ANSWERED: { label: "Yanıtlandı", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: <Clock size={12} /> },
  CLOSED: { label: "Kapalı", color: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: <XCircle size={12} /> },
};

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login");

  const { status: statusFilter } = await searchParams;
  const locale = await getLocale();

  const where = statusFilter && statusFilter !== "ALL" ? { status: statusFilter } : {};

  const tickets = await db.ticket.findMany({
    where,
    select: {
      id: true,
      subject: true,
      status: true,
      orderId: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, email: true } },
      messages: { select: { id: true, isAdmin: true }, orderBy: { createdAt: "desc" } },
      order: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const counts = await db.ticket.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const countMap: Record<string, number> = { ALL: tickets.length };
  for (const row of counts) {
    countMap[row.status] = row._count._all;
  }
  countMap.ALL = Object.values(countMap).reduce((a, b) => a + b, 0) - countMap.ALL + tickets.length;

  const tabs = [
    { id: "ALL", label: "Tümü" },
    { id: "OPEN", label: "Açık" },
    { id: "ANSWERED", label: "Yanıtlandı" },
    { id: "CLOSED", label: "Kapalı" },
  ];

  const active = statusFilter || "ALL";

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Destek Talepleri</h1>
        <p className="text-muted-foreground text-sm mt-1">Tüm kullanıcı destek taleplerini buradan yönetin</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const count = tab.id === "ALL"
            ? counts.reduce((a, c) => a + c._count._all, 0)
            : (counts.find((c) => c.status === tab.id)?._count._all ?? 0);
          return (
            <Link
              key={tab.id}
              href={tab.id === "ALL" ? `/${locale}/admin/tickets` : `/${locale}/admin/tickets?status=${tab.id}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-muted"}`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Tickets List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <MessageSquare size={40} className="opacity-30" />
            <p>Bu filtre için destek talebi bulunamadı.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((ticket) => {
              const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.OPEN;
              const totalMsgs = ticket.messages.length;
              const hasUnread = ticket.status === "OPEN" && ticket.messages[0] && !ticket.messages[0].isAdmin;
              return (
                <Link
                  key={ticket.id}
                  href={`/${locale}/admin/tickets/${ticket.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <p className="font-medium text-sm truncate">{ticket.subject}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{ticket.user.name || ticket.user.email}</span>
                      <span>·</span>
                      <span>{ticket.user.email}</span>
                      {ticket.orderId && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Package size={10} />
                            Sipariş bağlı
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MessageSquare size={12} />
                      {totalMsgs}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ticket.updatedAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
