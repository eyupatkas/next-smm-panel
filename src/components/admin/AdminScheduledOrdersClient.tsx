"use client";

import { useState, useMemo, useActionState, useEffect } from "react";
import { adminCancelScheduledOrder, type CancelScheduledOrderState } from "@/lib/actions/scheduled-order-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  Repeat,
  TimerOff,
  Ban,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────── */

type ScheduledOrderItem = {
  id: string;
  link: string;
  quantity: number;
  charge: number;
  scheduledAt: string;
  status: string;
  isRecurring: boolean;
  recurrenceEveryHours: number | null;
  recurrenceTimes: number | null;
  recurrenceEndAt: string | null;
  executedCount: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  executedOrderIds: string[];
  note: string | null;
  createdAt: string;
  serviceName: string;
  user: { id: string; name: string | null; email: string | null };
};

type Props = {
  scheduledOrders: ScheduledOrderItem[];
  stats: Record<string, number>;
};

/* ─── Helpers ────────────────────────────────────────────── */

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  PENDING:    { label: "Bekliyor",   color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    icon: Clock },
  PROCESSING: { label: "Çalışıyor", color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   icon: Loader2 },
  COMPLETED:  { label: "Tamamlandı",color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  PARTIAL:    { label: "Kısmi",     color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20",  icon: AlertTriangle },
  CANCELED:   { label: "İptal",     color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     icon: XCircle },
  FAILED:     { label: "Başarısız", color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    icon: TimerOff },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Main Component ──────────────────────────────────────── */

export function AdminScheduledOrdersClient({ scheduledOrders, stats }: Props) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelState, cancelAction, cancelPending] = useActionState<CancelScheduledOrderState, FormData>(
    adminCancelScheduledOrder,
    {}
  );

  useEffect(() => {
    if (cancelState.success) {
      queueMicrotask(() => setCancelTarget(null));
    }
  }, [cancelState.success]);

  const filtered = useMemo(() => {
    let list = scheduledOrders;
    if (filterStatus !== "ALL") list = list.filter((o) => o.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.serviceName.toLowerCase().includes(q) ||
          (o.user.name ?? "").toLowerCase().includes(q) ||
          (o.user.email ?? "").toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.link.toLowerCase().includes(q)
      );
    }
    return list;
  }, [scheduledOrders, filterStatus, search]);

  const totalReserved = useMemo(
    () => scheduledOrders.filter((o) => o.status === "PENDING").reduce((s, o) => s + o.charge, 0),
    [scheduledOrders]
  );

  const statusFilters = ["ALL", "PENDING", "COMPLETED", "CANCELED", "FAILED"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock size={22} className="text-primary" />
            Zamanlanmış Sipariş Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tüm kullanıcıların zamanlanmış siparişlerini yönetin
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground text-xs">Bekleyen Rezerv</p>
          <p className="font-bold text-primary text-base">
            {totalReserved.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { key: "ALL", label: "Toplam", count: scheduledOrders.length, color: "text-slate-400", icon: CalendarClock },
          { key: "PENDING", label: "Bekliyor", count: stats["PENDING"] ?? 0, color: "text-blue-400", icon: Clock },
          { key: "COMPLETED", label: "Tamamlandı", count: stats["COMPLETED"] ?? 0, color: "text-emerald-400", icon: CheckCircle2 },
          { key: "CANCELED", label: "İptal", count: stats["CANCELED"] ?? 0, color: "text-red-400", icon: XCircle },
          { key: "FAILED", label: "Başarısız", count: stats["FAILED"] ?? 0, color: "text-rose-400", icon: TimerOff },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-card p-3 flex items-center gap-2">
            <Icon size={16} className={color} />
            <div>
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-base font-bold">{count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Servis, kullanıcı, link ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                filterStatus === s
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "border-white/10 text-muted-foreground hover:border-white/20"
              )}
            >
              {s === "ALL" ? "Tümü" : STATUS_META[s]?.label}
              {s !== "ALL" && stats[s] ? <span className="ml-1 opacity-60">({stats[s]})</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {["Kullanıcı", "Servis", "Link / Miktar", "Planlanan", "Çalışma", "Durum", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const meta = STATUS_META[o.status] ?? STATUS_META["PENDING"];
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{o.user.name ?? "—"}</p>
                        <p className="text-[11px] text-muted-foreground">{o.user.email}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          {o.isRecurring && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
                              <Repeat size={8} /> Tekrarlı
                            </span>
                          )}
                          <p className="text-sm truncate">{o.serviceName}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          #{o.id.slice(-8).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">{o.link}</p>
                        <p className="text-xs font-medium">{o.quantity.toLocaleString("tr-TR")} adet</p>
                        <p className="text-[11px] text-primary font-semibold">
                          {o.charge.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold">{fmtDate(o.scheduledAt)}</p>
                        {o.nextRunAt && o.status === "PENDING" && (
                          <p className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                            <PlayCircle size={10} /> {fmtDate(o.nextRunAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-base font-bold">{o.executedCount}</p>
                        {o.recurrenceTimes && (
                          <p className="text-[10px] text-muted-foreground">/ {o.recurrenceTimes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                          meta.color, meta.bg, meta.border
                        )}>
                          <StatusIcon size={10} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {o.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => setCancelTarget(o.id)}
                          >
                            <Ban size={11} /> İptal
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel confirm */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Ban size={18} /> Siparişi İptal Et
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu zamanlanmış sipariş iptal edilecek ve kullanıcının bakiyesi iade edilecektir.
          </p>
          {cancelState.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {cancelState.error}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCancelTarget(null)} disabled={cancelPending}>
              Vazgeç
            </Button>
            <form action={cancelAction}>
              <input type="hidden" name="scheduledOrderId" value={cancelTarget ?? ""} />
              <Button type="submit" variant="destructive" className="gap-2" disabled={cancelPending}>
                {cancelPending ? <><Loader2 size={14} className="animate-spin" /> İptal ediliyor...</> : <><Ban size={14} /> Evet, İptal Et</>}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
