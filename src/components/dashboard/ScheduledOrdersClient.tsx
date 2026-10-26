"use client";

import { useState, useMemo, useActionState, useEffect } from "react";
import {
  createScheduledOrder,
  cancelScheduledOrder,
  type CreateScheduledOrderState,
  type CancelScheduledOrderState,
} from "@/lib/actions/scheduled-order-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateClientCharge, unitPriceSuffix } from "@/lib/client-pricing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarClock,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  ChevronDown,
  Repeat,
  Ban,
  PlayCircle,
  TimerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────── */

type ServiceOption = {
  id: string;
  name: string;
  min: number;
  max: number;
  unitPrice: number;
  pricingMode?: "PER_THOUSAND" | "PER_UNIT";
  categoryName: string;
  parentCategoryName: string | null;
  providerCode: string | null;
};

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
  note: string | null;
  createdAt: string;
  serviceName: string;
  chargeFormatted: string;
};

type Props = {
  scheduledOrders: ScheduledOrderItem[];
  serviceOptions: ServiceOption[];
  userBalance: number;
  fpLocale: { currency: unknown; intlLocale: string };
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
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function minDateTime() {
  const d = new Date(Date.now() + 5 * 60 * 1000); // 5 min from now
  return d.toISOString().slice(0, 16);
}

/* ─── Create Form ─────────────────────────────────────────── */

function CreateScheduledOrderForm({
  serviceOptions,
  userBalance,
  fpLocale,
  onSuccess,
}: {
  serviceOptions: ServiceOption[];
  userBalance: number;
  fpLocale: unknown;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<CreateScheduledOrderState, FormData>(
    createScheduledOrder,
    {}
  );
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceEveryHours, setRecurrenceEveryHours] = useState("24");
  const [recurrenceTimes, setRecurrenceTimes] = useState("");

  useEffect(() => {
    if (state.success) {
      onSuccess();
    }
  }, [state.success]);

  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return serviceOptions.slice(0, 30);
    const q = serviceSearch.toLowerCase();
    return serviceOptions
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.categoryName.toLowerCase().includes(q) ||
          (s.parentCategoryName ?? "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [serviceOptions, serviceSearch]);

  const quantityNum = parseInt(quantity) || 0;
  const totalCharge = selectedService
    ? calculateClientCharge(selectedService.unitPrice, quantityNum, selectedService.pricingMode)
    : 0;
  const hasEnoughBalance = userBalance >= totalCharge;

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {/* Service selector */}
      <div className="space-y-1.5">
        <Label>Servis *</Label>
        <div className="relative">
          <div
            className="flex items-center gap-2 h-10 rounded-lg border border-white/10 bg-card px-3 cursor-pointer hover:border-white/20 transition-colors"
            onClick={() => setShowServiceDropdown(!showServiceDropdown)}
          >
            <Search size={14} className="text-muted-foreground shrink-0" />
            {selectedService ? (
              <span className="text-sm flex-1 truncate">{selectedService.name}</span>
            ) : (
              <input
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                placeholder="Servis ara..."
                value={serviceSearch}
                onChange={(e) => { setServiceSearch(e.target.value); setShowServiceDropdown(true); }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {selectedService && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedService(null); setServiceSearch(""); }} className="text-muted-foreground hover:text-foreground">
                <XCircle size={14} />
              </button>
            )}
            <ChevronDown size={14} className="text-muted-foreground" />
          </div>
          {showServiceDropdown && !selectedService && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-card shadow-xl max-h-64 overflow-y-auto">
              {filteredServices.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">Sonuç bulunamadı</p>
              ) : (
                filteredServices.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    onClick={() => { setSelectedService(svc); setShowServiceDropdown(false); setQuantity(String(svc.min)); }}
                  >
                    <div className="flex items-center gap-2">
                      {svc.providerCode && (
                        <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded border border-sky-500/20 bg-sky-500/10 text-sky-400">
                          {svc.providerCode}
                        </span>
                      )}
                      <span className="text-sm font-medium truncate">{svc.name}</span>
                    </div>
                    <div className="flex gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{svc.parentCategoryName ?? svc.categoryName}</span>
                      <span>{svc.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 4 })} TL {unitPriceSuffix(svc.pricingMode)}</span>
                      <span>Min: {svc.min}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedService && (
          <input type="hidden" name="serviceId" value={selectedService.id} />
        )}
        {!selectedService && <input type="hidden" name="serviceId" value="" />}
      </div>

      {/* Link */}
      <div className="space-y-1.5">
        <Label htmlFor="link">Link *</Label>
        <Input id="link" name="link" placeholder="https://instagram.com/..." required />
      </div>

      {/* Quantity */}
      <div className="space-y-1.5">
        <Label htmlFor="quantity">Miktar *</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min={selectedService?.min ?? 1}
          max={selectedService?.max ?? 1000000}
          placeholder={selectedService ? `Min: ${selectedService.min} · Max: ${selectedService.max}` : "Miktar"}
          required
        />
        {selectedService && quantityNum > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tahmini tutar</span>
            <span className={cn("font-semibold", hasEnoughBalance ? "text-primary" : "text-red-400")}>
              {totalCharge.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
              {!hasEnoughBalance && " (Yetersiz bakiye)"}
            </span>
          </div>
        )}
      </div>

      {/* Scheduled date */}
      <div className="space-y-1.5">
        <Label htmlFor="scheduledAt">Planlanan Tarih ve Saat *</Label>
        <Input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          min={minDateTime()}
          required
          className="[color-scheme:dark]"
        />
      </div>

      {/* Recurring toggle */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat size={16} className="text-primary" />
            <div>
              <p className="text-sm font-medium">Tekrar Eden Sipariş</p>
              <p className="text-xs text-muted-foreground">Belirlediğiniz aralıklarla otomatik tekrarlar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRecurring(!isRecurring)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              isRecurring ? "bg-primary" : "bg-white/10"
            )}
          >
            <span className={cn(
              "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
              isRecurring ? "translate-x-4" : "translate-x-0.5"
            )} />
          </button>
        </div>
        <input type="hidden" name="isRecurring" value={isRecurring ? "true" : "false"} />

        {isRecurring && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div className="space-y-1.5">
              <Label className="text-xs">Her kaç saatte bir?</Label>
              <Input
                name="recurrenceEveryHours"
                type="number"
                min={1}
                value={recurrenceEveryHours}
                onChange={(e) => setRecurrenceEveryHours(e.target.value)}
                placeholder="24"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kaç kez? (boş = limitsiz)</Label>
              <Input
                name="recurrenceTimes"
                type="number"
                min={2}
                value={recurrenceTimes}
                onChange={(e) => setRecurrenceTimes(e.target.value)}
                placeholder="Sınırsız"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Bitiş tarihi (opsiyonel)</Label>
              <Input
                name="recurrenceEndAt"
                type="datetime-local"
                min={minDateTime()}
                className="[color-scheme:dark]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <Label htmlFor="note">Not (opsiyonel)</Label>
        <Input id="note" name="note" placeholder="Kendi notunuz..." />
      </div>

      <Button type="submit" className="w-full gap-2" disabled={pending || !selectedService}>
        {pending ? (
          <><Loader2 size={16} className="animate-spin" /> Oluşturuluyor...</>
        ) : (
          <><CalendarClock size={16} /> Zamanlanmış Sipariş Oluştur</>
        )}
      </Button>
    </form>
  );
}

/* ─── Scheduled Order Card ───────────────────────────────── */

function ScheduledOrderCard({
  order,
  onCancel,
  fpLocale,
}: {
  order: ScheduledOrderItem;
  onCancel: (id: string) => void;
  fpLocale: unknown;
}) {
  const meta = STATUS_META[order.status] ?? STATUS_META["PENDING"];
  const StatusIcon = meta.icon;
  const canCancel = order.status === "PENDING";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card overflow-hidden hover:border-white/10 transition-all">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {order.isRecurring && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                  <Repeat size={9} /> Tekrarlı
                </span>
              )}
            </div>
            <p className="font-semibold text-sm leading-snug mt-1">{order.serviceName}</p>
            <p className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
              #{order.id.slice(-8).toUpperCase()} · {fmtDate(order.createdAt)}
            </p>
          </div>
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border shrink-0",
            meta.color, meta.bg, meta.border
          )}>
            <StatusIcon size={11} className={order.status === "PROCESSING" ? "animate-spin" : undefined} />
            {meta.label}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 space-y-0.5">
            <p className="text-muted-foreground">Planlanan</p>
            <p className="font-semibold text-primary">{fmtDate(order.scheduledAt)}</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 space-y-0.5">
            <p className="text-muted-foreground">Tutar</p>
            <p className="font-semibold">{order.chargeFormatted}</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 space-y-0.5">
            <p className="text-muted-foreground">Miktar</p>
            <p className="font-semibold">{order.quantity.toLocaleString("tr-TR")}</p>
          </div>
          {order.isRecurring && (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 space-y-0.5">
              <p className="text-muted-foreground">Çalışma</p>
              <p className="font-semibold">{order.executedCount} kez</p>
            </div>
          )}
        </div>

        {/* Link */}
        <div className="text-[11px] text-muted-foreground/70 truncate">
          <span className="text-muted-foreground">Link: </span>
          <span>{order.link}</span>
        </div>

        {/* Recurring details */}
        {order.isRecurring && order.status === "PENDING" && order.nextRunAt && (
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-[11px] flex items-center gap-2">
            <PlayCircle size={12} className="text-primary shrink-0" />
            <span className="text-muted-foreground">Sonraki çalışma: </span>
            <span className="font-semibold text-primary">{fmtDate(order.nextRunAt)}</span>
          </div>
        )}

        {order.note && (
          <p className="text-[11px] text-muted-foreground/60 italic">Not: {order.note}</p>
        )}

        {/* Actions */}
        {canCancel && (
          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => onCancel(order.id)}
            >
              <Ban size={11} /> İptal Et
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */

export function ScheduledOrdersClient({ scheduledOrders, serviceOptions, userBalance, fpLocale }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [cancelState, cancelAction, cancelPending] = useActionState<CancelScheduledOrderState, FormData>(
    async (prevState, formData) => {
      const result = await cancelScheduledOrder(prevState, formData);
      if (result.success) {
        setCancelTarget(null);
      }
      return result;
    },
    {}
  );

  const filtered = useMemo(
    () =>
      filterStatus === "ALL"
        ? scheduledOrders
        : scheduledOrders.filter((o) => o.status === filterStatus),
    [scheduledOrders, filterStatus]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: scheduledOrders.length };
    for (const o of scheduledOrders) {
      c[o.status] = (c[o.status] ?? 0) + 1;
    }
    return c;
  }, [scheduledOrders]);

  const statusFilters = ["ALL", "PENDING", "COMPLETED", "CANCELED", "FAILED"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock size={24} className="text-primary" />
            Zamanlanmış Siparişler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Belirli bir tarihte veya düzenli aralıklarla otomatik sipariş oluşturun
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus size={16} /> Yeni Zamanlama
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Toplam", value: scheduledOrders.length, icon: CalendarClock, color: "text-slate-400" },
          { label: "Bekliyor", value: counts["PENDING"] ?? 0, icon: Clock, color: "text-blue-400" },
          { label: "Tamamlandı", value: counts["COMPLETED"] ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Başarısız", value: counts["FAILED"] ?? 0, icon: TimerOff, color: "text-rose-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-white/[0.06] bg-card p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-xl bg-white/[0.04]", color)}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
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
            {s === "ALL" ? "Tümü" : STATUS_META[s]?.label ?? s}
            {counts[s] != null && (
              <span className="ml-1.5 text-muted-foreground/60">({counts[s]})</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-card py-20 text-center text-muted-foreground">
          <CalendarClock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Zamanlanmış sipariş yok.</p>
          <p className="text-xs mt-1">
            &quot;Yeni Zamanlama&quot; butonunu kullanarak sipariş oluşturun.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filtered.map((order) => (
            <ScheduledOrderCard
              key={order.id}
              order={order}
              onCancel={(id) => setCancelTarget(id)}
              fpLocale={fpLocale}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock size={18} className="text-primary" />
              Zamanlanmış Sipariş Oluştur
            </DialogTitle>
          </DialogHeader>
          <CreateScheduledOrderForm
            serviceOptions={serviceOptions}
            userBalance={userBalance}
            fpLocale={fpLocale}
            onSuccess={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Cancel confirm modal */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Ban size={18} /> Zamanlanmış Siparişi İptal Et
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu zamanlanmış sipariş iptal edilecek ve rezerve edilen bakiye iade edilecektir.
            Bu işlem geri alınamaz.
          </p>
          {cancelState.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {cancelState.error}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCancelTarget(null)} disabled={cancelPending}>
              Vazgeç
            </Button>
            <form action={cancelAction}>
              <input type="hidden" name="scheduledOrderId" value={cancelTarget ?? ""} />
              <Button
                type="submit"
                variant="destructive"
                className="gap-2"
                disabled={cancelPending}
              >
                {cancelPending ? (
                  <><Loader2 size={14} className="animate-spin" /> İptal ediliyor...</>
                ) : (
                  <><Ban size={14} /> Evet, İptal Et</>
                )}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
