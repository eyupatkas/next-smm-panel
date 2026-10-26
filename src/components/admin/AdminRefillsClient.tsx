"use client";

import { useState, useMemo, useActionState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateRefillStatus, type UpdateRefillState } from "@/lib/actions/scheduled-order-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TimerOff,
  Search,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────── */

type RefillItem = {
  id: string;
  status: string;
  providerRefillId: string | null;
  adminNote: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string | null; email: string | null };
  order: {
    id: string;
    status: string;
    quantity: number;
    charge: number;
    apiOrderId: string | null;
    link: string;
    serviceName: string;
  };
};

type Props = {
  refills: RefillItem[];
  stats: Record<string, number>;
};

/* ─── Helpers ────────────────────────────────────────────── */

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  PENDING:   { label: "Bekliyor",    color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  icon: Clock },
  SENT:      { label: "Gönderildi",  color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    icon: RefreshCw },
  COMPLETED: { label: "Tamamlandı",  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  REJECTED:  { label: "Reddedildi",  color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   icon: AlertTriangle },
  FAILED:    { label: "Başarısız",   color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     icon: TimerOff },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Edit Dialog ─────────────────────────────────────────── */

function EditRefillDialog({
  refill,
  open,
  onClose,
  onSaved,
}: {
  refill: RefillItem;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<UpdateRefillState, FormData>(
    adminUpdateRefillStatus,
    {}
  );

  useEffect(() => {
    if (state.success) {
      queueMicrotask(onSaved);
    }
  }, [state.success, onSaved]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Telafi Durumunu Güncelle</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="font-medium">{refill.order.serviceName}</p>
          <p className="text-muted-foreground text-xs">{refill.user.name ?? refill.user.email}</p>
          <p className="text-muted-foreground text-xs">Sipariş #{refill.order.id.slice(-8).toUpperCase()}</p>
          {refill.providerRefillId && (
            <p className="text-xs text-primary">Provider Refill ID: {refill.providerRefillId}</p>
          )}
        </div>

        {state.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="refillId" value={refill.id} />

          <div className="space-y-1.5">
            <Label>Durum</Label>
            <select
              name="status"
              defaultValue={refill.status}
              className="w-full h-10 rounded-lg border border-white/10 bg-card px-3 text-sm focus:outline-none"
            >
              {Object.entries(STATUS_META).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Admin Notu (opsiyonel)</Label>
            <Input
              name="adminNote"
              defaultValue={refill.adminNote ?? ""}
              placeholder="İç not..."
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <><Loader2 size={14} className="animate-spin" /> Kaydediliyor...</> : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ──────────────────────────────────────── */

export function AdminRefillsClient({ refills, stats }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [editTarget, setEditTarget] = useState<RefillItem | null>(null);

  const closeEditTarget = useCallback(() => {
    setEditTarget(null);
  }, []);

  const handleSaved = useCallback(() => {
    setEditTarget(null);
    router.refresh();
  }, [router]);

  const filtered = useMemo(() => {
    let list = refills;
    if (filterStatus !== "ALL") list = list.filter((r) => r.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.order.serviceName.toLowerCase().includes(q) ||
          (r.user.name ?? "").toLowerCase().includes(q) ||
          (r.user.email ?? "").toLowerCase().includes(q) ||
          r.order.id.toLowerCase().includes(q) ||
          (r.providerRefillId ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [refills, filterStatus, search]);

  const statusFilters = ["ALL", "PENDING", "SENT", "COMPLETED", "REJECTED", "FAILED"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <RefreshCw size={22} className="text-emerald-400" />
          Telafi Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kullanıcıların telafi taleplerini buradan yönetin
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {statusFilters.slice(1).map((s) => {
          const meta = STATUS_META[s];
          const count = stats[s] ?? 0;
          return (
            <div key={s} className="rounded-xl border border-white/[0.06] bg-card p-3 flex items-center gap-2">
              <meta.icon size={16} className={meta.color} />
              <div>
                <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                <p className="text-base font-bold">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Servis adı, kullanıcı, sipariş ID ara..."
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
              {s !== "ALL" && stats[s] ? <span className="ml-1 text-muted-foreground/60">({stats[s]})</span> : null}
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
                {["Tarih", "Kullanıcı", "Servis / Sipariş", "Provider ID", "Durum", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const meta = STATUS_META[r.status] ?? STATUS_META["PENDING"];
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(r.requestedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{r.user.name ?? "—"}</p>
                        <p className="text-[11px] text-muted-foreground">{r.user.email}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-sm truncate">{r.order.serviceName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          #{r.order.id.slice(-8).toUpperCase()}
                          {r.order.apiOrderId && ` · P#${r.order.apiOrderId}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-muted-foreground">
                          {r.providerRefillId ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                          meta.color, meta.bg, meta.border
                        )}>
                          <StatusIcon size={10} />
                          {meta.label}
                        </span>
                        {r.adminNote && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{r.adminNote}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => setEditTarget(r)}
                        >
                          Düzenle <ChevronRight size={12} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget && (
        <EditRefillDialog
          refill={editTarget}
          open={Boolean(editTarget)}
          onClose={closeEditTarget}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
