"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Hash,
  Link2,
  TrendingDown,
  TrendingUp,
  Calendar,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateOrderEta } from "@/lib/services/eta-calculator";

type OrderDetail = {
  id: string;
  status: string;
  providerStatus?: string | null;
  error?: string | null;
  quantity: number;
  startCount: number;
  remains: number;
  charge: string;
  refundedAmount?: string | null;
  link?: string | null;
  lastRefillAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  serviceName: string;
  chargeFormatted: string;
  refundedFormatted?: string;
  completionPct: number;
  delivered: number;
};

const STATUS_META: Record<
  string,
  { label: string; icon: typeof Clock; color: string; bg: string; border: string }
> = {
  PENDING: {
    label: "Bekliyor",
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  PROCESSING: {
    label: "İşlem Sırasında",
    icon: Loader2,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  COMPLETED: {
    label: "Tamamlandı",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  PARTIAL: {
    label: "Kısmi Tamamlandı",
    icon: AlertTriangle,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  CANCELED: {
    label: "İptal Edildi",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  REFUNDED: {
    label: "İade Edildi",
    icon: RotateCcw,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  CANCEL_REQUESTED: {
    label: "İptal Bekleniyor",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
};

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] items-start gap-3 border-b border-border/30 py-3 last:border-0">
      <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 text-right text-xs sm:text-sm font-medium text-foreground", valueClass)}>
        {value}
      </span>
    </div>
  );
}

export function OrderDetailModal({ order }: { order: OrderDetail }) {
  const [open, setOpen] = useState(false);

  const isCancelRequested =
    order.error === "cancel_requested" ||
    order.providerStatus === "CANCEL_REQUESTED";
  const displayStatus = isCancelRequested ? "CANCEL_REQUESTED" : order.status;
  const meta = STATUS_META[displayStatus] ?? STATUS_META.PENDING;
  const StatusIcon = meta.icon;
  const etaInfo = calculateOrderEta(order, "tr");

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 border-border hover:bg-muted/50 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        Detay
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl overflow-hidden p-0 bg-background border-border/50">
          <div className="border-b border-border/40 bg-gradient-to-br from-muted/30 via-muted/5 to-transparent px-5 py-4 sm:px-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-8 text-base sm:text-lg font-bold tracking-tight text-foreground">
                <Hash size={16} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{order.serviceName}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                  meta.color,
                  meta.bg,
                  meta.border,
                )}
              >
                <StatusIcon
                  size={12}
                  className={cn(order.status === "PROCESSING" && "animate-spin")}
                />
                {meta.label}
              </span>
              <span className="rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-[11px] font-mono text-muted-foreground">
                #{order.id.slice(-10).toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
                <Sparkles size={11} className="text-sky-500 dark:text-sky-400 font-medium" />
                Sipariş özeti
              </span>
            </div>

            {[
              "PENDING",
              "PROCESSING",
              "COMPLETED",
              "PARTIAL",
            ].includes(order.status) && (
              <div className="mt-4 rounded-xl border border-border/40 bg-muted/10 p-3.5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">Teslim ilerlemesi</span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      order.completionPct === 100
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-primary",
                    )}
                  >
                    {order.completionPct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      order.completionPct === 100
                        ? "bg-emerald-500"
                        : "bg-primary",
                    )}
                    style={{ width: `${order.completionPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="max-h-[calc(92vh-180px)] overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6">
              <div className="md:col-span-7 rounded-xl border border-border/40 bg-card/40 px-4 sm:px-5 shadow-xs">
                <div className="border-b border-border/40 py-3">
                  <p className="text-sm font-bold text-foreground">Sipariş bilgileri</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Temel teslimat ve hedef detayları
                  </p>
                </div>

                {order.link && (
                  <Row
                    label="Hedef"
                    value={
                      <a
                        href={order.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-end gap-1 text-right text-blue-600 dark:text-blue-400 hover:underline max-w-full min-w-0"
                      >
                        <Link2 size={12} className="shrink-0" />
                        <span className="truncate text-left text-xs sm:text-sm max-w-[150px] sm:max-w-[250px] md:max-w-[200px] lg:max-w-[300px]">
                          {order.link}
                        </span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    }
                  />
                )}

                <Row
                  label="Sipariş tarihi"
                  value={new Date(order.createdAt).toLocaleString("tr-TR")}
                />
                <Row
                  label="Miktar"
                  value={
                    <span className="inline-flex max-w-full items-center justify-end gap-1 text-right">
                      <TrendingUp size={13} className="shrink-0 text-blue-500 dark:text-blue-400" />
                      {order.quantity.toLocaleString("tr-TR")}
                    </span>
                  }
                />
                {order.startCount > 0 && (
                  <Row
                    label="Başlangıç"
                    value={order.startCount.toLocaleString("tr-TR")}
                  />
                )}
                {order.delivered > 0 && (
                  <Row
                    label="Teslim edilen"
                    value={
                      <span className="inline-flex max-w-full items-center justify-end gap-1 text-right text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={13} className="shrink-0" />
                        {order.delivered.toLocaleString("tr-TR")}
                      </span>
                    }
                  />
                )}
                {order.remains > 0 && order.status !== "COMPLETED" && (
                  <Row
                    label="Kalan"
                    value={
                      <span className="inline-flex max-w-full items-center justify-end gap-1 text-right text-amber-600 dark:text-amber-400">
                        <TrendingDown size={13} className="shrink-0" />
                        {order.remains.toLocaleString("tr-TR")}
                      </span>
                    }
                  />
                )}
                {etaInfo.hasStarted && etaInfo.formattedEta && (
                  <Row
                    label="Tahmini tamamlama"
                    value={
                      <div className="text-right">
                        <span className="inline-flex items-center justify-end gap-1 text-right font-semibold text-xs sm:text-sm text-sky-600 dark:text-sky-400">
                          <Clock size={13} className="shrink-0 text-sky-500" />
                          {etaInfo.formattedEta}
                        </span>
                        {etaInfo.speedText && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{etaInfo.speedText}</p>
                        )}
                      </div>
                    }
                  />
                )}
              </div>

              <div className="md:col-span-5 space-y-4">
                <div className="rounded-xl border border-border/40 bg-card/40 px-4 sm:px-5 shadow-xs">
                  <div className="border-b border-border/40 py-3">
                    <p className="text-sm font-bold text-foreground">Ödeme ve durum</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Siparişin finansal ve operasyonel özeti
                    </p>
                  </div>
                  <Row
                    label="Tutar"
                    value={<span className="font-bold text-foreground">{order.chargeFormatted}</span>}
                  />
                  {order.refundedFormatted && Number(order.refundedAmount) > 0 && (
                    <Row
                      label="İade"
                      value={
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          +{order.refundedFormatted}
                        </span>
                      }
                    />
                  )}
                  {order.lastRefillAt && (
                    <Row
                      label="Son telafi"
                      value={
                        <span className="inline-flex max-w-full items-center justify-end gap-1 text-right text-muted-foreground">
                          <RefreshCw size={11} className="shrink-0" />
                          {new Date(order.lastRefillAt).toLocaleString("tr-TR")}
                        </span>
                      }
                    />
                  )}
                  {order.cancelledAt && (
                    <Row
                      label="İptal tarihi"
                      value={
                        <span className="inline-flex max-w-full items-center justify-end gap-1 text-right text-red-600 dark:text-red-400">
                          <Calendar size={11} className="shrink-0" />
                          {new Date(order.cancelledAt).toLocaleString("tr-TR")}
                        </span>
                      }
                    />
                  )}
                </div>

                {order.error && order.error !== "cancel_requested" && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                      Operasyon notu
                    </p>
                    <p className="mt-2 break-words text-xs sm:text-sm leading-relaxed text-red-700 dark:text-red-200/90">
                      {order.error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

