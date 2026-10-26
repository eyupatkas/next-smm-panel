"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StuckOrder = {
  id: string;
  shortId: string;
  status: string;
  charge: number;
  quantity: number;
  remains: number;
  startCount: number;
  link: string;
  apiOrderId: string | null;
  providerStatus: string | null;
  providerSyncError: string | null;
  stuckAt: string | null;
  stuckReason: string | null;
  createdAt: string;
  cancelRequested: boolean;
  canCancel: boolean;
  serviceName: string;
  providerName: string | null;
  user: { id: string; name: string | null; email: string | null };
};

type Props = {
  orders: StuckOrder[];
  stats: { count: number; totalCharge: number };
};

type ActionId = "recheck" | "cancel_provider" | "cancel_refund" | "mark_completed";

const ACTIONS: Array<{ id: ActionId; label: string; icon: typeof RefreshCw; tone: string; confirmLabel?: string }> = [
  { id: "recheck", label: "Yeniden Kontrol", icon: RefreshCw, tone: "border-sky-500/30 text-sky-400 hover:bg-sky-500/10" },
  { id: "cancel_provider", label: "Sağlayıcıya İptal", icon: Undo2, tone: "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" },
  {
    id: "cancel_refund",
    label: "İptal + İade",
    icon: Ban,
    tone: "border-red-500/30 text-red-400 hover:bg-red-500/10",
    confirmLabel: "İade Onayla",
  },
  { id: "mark_completed", label: "Tamamlandı Say", icon: CheckCircle2, tone: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hoursSince(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 24) return `${hours} saat`;
  return `${Math.floor(hours / 24)} gün ${hours % 24} saat`;
}

export function AdminStuckOrdersClient({ orders, stats }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.shortId.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.serviceName.toLowerCase().includes(q) ||
        (o.user.name ?? "").toLowerCase().includes(q) ||
        (o.user.email ?? "").toLowerCase().includes(q) ||
        (o.providerName ?? "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  async function runAction(orderId: string, action: ActionId) {
    setPendingAction(`${orderId}:${action}`);
    setConfirmingId(null);
    try {
      const res = await fetch("/api/admin/stuck-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        toast.error(data.message ?? data.error ?? "İşlem tamamlanamadı.");
        return;
      }
      toast.success(data.message ?? "İşlem tamamlandı.");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <AlertTriangle size={22} className="text-amber-400" />
          Askıda Siparişler
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Beklenenden uzun süren, iptali sağlayıcıda onaylanmayan veya iletilemeyen siparişler. Sistem eşik aşan
          siparişlerde önce sağlayıcıdan otomatik iptal dener; onaylanmazsa siparişi burada toplar.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Askıda sipariş</p>
            <p className="text-xl font-bold">{stats.count}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/15">
            <Clock size={18} className="text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Toplam tutar</p>
            <p className="text-xl font-bold">{stats.totalCharge.toFixed(2)} ₺</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Sipariş no, kullanıcı, servis veya sağlayıcı ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {["Sipariş", "Kullanıcı", "Servis", "Tutar", "Durum", "Askıda", "İşlemler"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" /> Yükleniyor...
                      </span>
                    ) : (
                      "Askıda sipariş yok. Sistem düzenli olarak kontrol ediyor."
                    )}
                  </td>
                </tr>
              )}
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-white/[0.04] align-top last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-semibold">#{order.shortId}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtDate(order.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium">{order.user.name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{order.user.email}</p>
                  </td>
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="truncate text-xs font-medium" title={order.serviceName}>
                      {order.serviceName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {order.providerName ?? "Sağlayıcı yok"} · {order.quantity.toLocaleString("tr-TR")} adet
                      {order.canCancel ? "" : " · iptal yok"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {order.charge.toFixed(2)} ₺
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        order.status === "PROCESSING"
                          ? "bg-sky-500/10 text-sky-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      )}
                    >
                      {order.status === "PROCESSING" ? "İşlemde" : "Bekliyor"}
                    </span>
                    {order.cancelRequested && (
                      <span className="mt-1 block text-[10px] text-amber-400">İptal talebi gönderildi</span>
                    )}
                  </td>
                  <td className="max-w-[240px] px-4 py-3">
                    <p className="text-[11px] leading-4 text-muted-foreground">{order.stuckReason ?? "—"}</p>
                    {order.stuckAt && (
                      <p className="mt-1 text-[10px] text-amber-400/80">
                        {hoursSince(order.stuckAt)} önce işaretlendi
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {ACTIONS.map((action) => {
                        const busy = pendingAction === `${order.id}:${action.id}`;
                        const confirming = confirmingId === order.id && action.id === "cancel_refund";
                        const hidden =
                          (action.id === "cancel_provider" && (!order.apiOrderId || !order.canCancel)) ||
                          (action.id === "cancel_refund" && !order.apiOrderId && order.status !== "PENDING");
                        if (hidden) return null;

                        return (
                          <button
                            key={action.id}
                            type="button"
                            disabled={Boolean(pendingAction) || isPending}
                            onClick={() => {
                              if (action.confirmLabel && !confirming) {
                                setConfirmingId(order.id);
                                return;
                              }
                              void runAction(order.id, action.id);
                            }}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50",
                              action.tone,
                              confirming && "bg-red-500/20"
                            )}
                            title={action.label}
                          >
                            {busy ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <action.icon size={11} />
                            )}
                            {confirming ? (action.confirmLabel ?? action.label) : action.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Not: &quot;İptal + İade&quot; siparişi sağlayıcı onayı beklemeden kapatır ve teslim edilmeyen miktar kadar
        müşteriye iade yazar. Kesin teslim edilmiş siparişler için &quot;Tamamlandı Say&quot; kullanın.
      </p>
    </div>
  );
}
