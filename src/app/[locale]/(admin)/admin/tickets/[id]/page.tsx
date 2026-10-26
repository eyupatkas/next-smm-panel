import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { ArrowLeft, Package, User, Clock, CheckCircle, XCircle, MessageSquare, RefreshCw } from "lucide-react";
import { adminReplyTicket, adminCloseTicket, adminReopenTicket } from "@/lib/actions/admin-actions";
import { AdminReplyFormWithAi } from "@/components/admin/AdminReplyFormWithAi";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Açık", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ANSWERED: { label: "Yanıtlandı", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  CLOSED: { label: "Kapalı", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor",
  PROCESSING: "İşleniyor",
  COMPLETED: "Tamamlandı",
  PARTIAL: "Kısmi",
  CANCELED: "İptal",
  REFUNDED: "İade",
};

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login");

  const { id, locale } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      messages: { orderBy: { createdAt: "asc" } },
      order: {
        select: {
          id: true,
          status: true,
          charge: true,
          quantity: true,
          createdAt: true,
          service: { select: { name: true } },
        },
      },
    },
  });

  if (!ticket) {
    redirect(`/${locale}/admin/tickets`);
  }

  const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.OPEN;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/tickets`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{ticket.subject}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              #{ticket.id.slice(-8).toUpperCase()} &middot;{" "}
              {new Date(ticket.createdAt).toLocaleDateString("tr-TR", {
                day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${cfg.color}`}>
          {ticket.status === "OPEN" && <MessageSquare size={12} />}
          {ticket.status === "ANSWERED" && <Clock size={12} />}
          {ticket.status === "CLOSED" && <XCircle size={12} />}
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Messages */}
        <div className="lg:col-span-2 space-y-4">
          {/* Message Thread */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <MessageSquare size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Mesajlar ({ticket.messages.length})</span>
            </div>
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {ticket.messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Henüz mesaj yok.</p>
              ) : (
                ticket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.isAdmin ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      msg.isAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {msg.isAdmin ? "A" : (ticket.user.name?.[0] || ticket.user.email?.[0] || "?").toUpperCase()}
                    </div>
                    <div className={`max-w-[80%] ${msg.isAdmin ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.isAdmin
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}>
                        {msg.message}
                      </div>
                      <span className="text-xs text-muted-foreground px-1">
                        {msg.isAdmin ? "Admin" : (ticket.user.name || ticket.user.email)} &middot;{" "}
                        {new Date(msg.createdAt).toLocaleString("tr-TR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reply Form */}
          {ticket.status !== "CLOSED" ? (
            <AdminReplyFormWithAi
              ticketId={ticket.id}
              replyAction={adminReplyTicket}
              closeAction={adminCloseTicket}
            />
          ) : (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <XCircle size={16} />
                Bu destek talebi kapatılmış.
              </p>
              <form action={adminReopenTicket}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <button
                  type="submit"
                  className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <RefreshCw size={14} />
                  Yeniden Aç
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar: User & Order Info */}
        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <User size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Kullanıcı Bilgisi</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                  {(ticket.user.name?.[0] || ticket.user.email?.[0] || "?").toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{ticket.user.name || "İsimsiz"}</p>
                  <p className="text-xs text-muted-foreground">{ticket.user.email}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground border-t border-border pt-3">
                <div className="flex justify-between">
                  <span>Üyelik tarihi</span>
                  <span>{new Date(ticket.user.createdAt).toLocaleDateString("tr-TR")}</span>
                </div>
              </div>
              <Link
                href={`/${locale}/admin/users?search=${encodeURIComponent(ticket.user.email ?? "")}`}
                className="block w-full text-center text-xs py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Kullanıcı Profilini Aç
              </Link>
            </div>
          </div>

          {/* Linked Order */}
          {ticket.order && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Package size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">Bağlı Sipariş</span>
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sipariş No</span>
                  <span className="font-mono text-xs">#{ticket.order.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Servis</span>
                  <span className="text-xs text-right max-w-[55%] truncate">{ticket.order.service?.name || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Miktar</span>
                  <span>{ticket.order.quantity.toLocaleString("tr-TR")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ücret</span>
                  <span className="font-medium">₺{Number(ticket.order.charge).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Durum</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                    {ORDER_STATUS_LABELS[ticket.order.status] ?? ticket.order.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tarih</span>
                  <span className="text-xs">{new Date(ticket.order.createdAt).toLocaleDateString("tr-TR")}</span>
                </div>
                <Link
                  href={`/${locale}/admin/orders?search=${ticket.order.id}`}
                  className="block w-full text-center text-xs py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1"
                >
                  Siparişi Görüntüle
                </Link>
              </div>
            </div>
          )}

          {/* Ticket Actions */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Hızlı İşlemler</span>
            </div>
            <div className="p-3 space-y-2">
              {ticket.status !== "CLOSED" && (
                <form action={adminCloseTicket} className="w-full">
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
                  >
                    <XCircle size={14} />
                    Talebi Kapat
                  </button>
                </form>
              )}
              {ticket.status === "CLOSED" && (
                <form action={adminReopenTicket} className="w-full">
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-green-400 hover:border-green-500/30 hover:bg-green-500/5 transition-colors"
                  >
                    <RefreshCw size={14} />
                    Yeniden Aç
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
