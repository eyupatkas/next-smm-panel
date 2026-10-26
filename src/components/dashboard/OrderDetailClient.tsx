"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Hash,
  Link2,
  Loader2,
  AlertTriangle,
  PackageCheck,
  PlayCircle,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { formatPrice, getCurrencyForLocale, localeToIntlCode } from "@/lib/currency";
import { calculateOrderEta } from "@/lib/services/eta-calculator";
import { cn } from "@/lib/utils";
import { CancelOrderButton } from "@/components/dashboard/CancelOrderButton";
import { RefillOrderButton } from "@/components/dashboard/RefillOrderButton";
import { OrderSupportButton } from "@/components/dashboard/OrderSupportButton";

type OrderRow = {
  id: string;
  quantity: number;
  charge: number;
  status: string;
  error: string | null;
  link: string | null;
  startCount: number;
  remains: number;
  cancelledAt: string | null;
  refundedAmount: number | null;
  providerStatus: string | null;
  lastRefillAt: string | null;
  createdAt: string;
  service: {
    name: string;
    canCancel: boolean;
    canRefill: boolean;
    hasDripfeed: boolean;
  };
};

type Props = {
  locale: string;
  order: OrderRow;
};

const STATUS_META: Record<
  string,
  { label: string; icon: typeof Clock; color: string; bg: string; border: string; accent: string }
> = {
  PENDING: {
    label: "Bekliyor",
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    accent: "bg-yellow-500",
  },
  PROCESSING: {
    label: "İşlem Sırasında",
    icon: Loader2,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    accent: "bg-blue-500",
  },
  COMPLETED: {
    label: "Tamamlandı",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    accent: "bg-emerald-500",
  },
  PARTIAL: {
    label: "Kısmi Tamamlandı",
    icon: AlertTriangle,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    accent: "bg-orange-500",
  },
  CANCELED: {
    label: "İptal Edildi",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    accent: "bg-red-500",
  },
  REFUNDED: {
    label: "İade Edildi",
    icon: RotateCcw,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    accent: "bg-purple-500",
  },
  CANCEL_REQUESTED: {
    label: "İptal Bekleniyor",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    accent: "bg-amber-500",
  },
};

export function OrderDetailClient({ locale, order }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const formatMoney = (amount: number | null) =>
    amount != null ? formatPrice(amount, currency, intlLocale) : "-";

  const isCancelRequested =
    order.error === "cancel_requested" ||
    order.providerStatus === "CANCEL_REQUESTED";
  const displayStatus = isCancelRequested ? "CANCEL_REQUESTED" : order.status;
  const meta = STATUS_META[displayStatus] ?? STATUS_META.PENDING;
  const StatusIcon = meta.icon;

  const createdAt = new Date(order.createdAt);
  const etaInfo = calculateOrderEta(order, locale);
  const delivered = etaInfo.delivered;
  const completionPct = etaInfo.progressPercent;

  const isCancellable =
    order.service.canCancel &&
    !order.cancelledAt &&
    displayStatus !== "CANCEL_REQUESTED" &&
    ["PENDING", "PROCESSING"].includes(order.status);
  const isRefillable = order.service.canRefill && ["COMPLETED", "PARTIAL"].includes(order.status);

  const handleCopyLink = () => {
    if (order.link) {
      navigator.clipboard.writeText(order.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyId = () => {
    void navigator.clipboard.writeText(order.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const timelineStep: number | null = displayStatus === "COMPLETED" || displayStatus === "PARTIAL"
    ? 3
    : displayStatus === "PROCESSING"
      ? 2
      : displayStatus === "PENDING"
        ? 0
        : null;
  const timeline = [
    { label: "Sipariş alındı", icon: CheckCircle2 },
    { label: "Hazırlanıyor", icon: Clock },
    { label: "Teslimat başladı", icon: PlayCircle },
    { label: displayStatus === "PARTIAL" ? "Kısmi tamamlandı" : "Tamamlandı", icon: PackageCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Geri Dön Butonu */}
      <div>
        <Link
          href={`/${locale}/dashboard/orders`}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground shadow-xs transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Siparişlerime Geri Dön
        </Link>
      </div>

      {/* Sipariş Üst Bilgileri */}
      <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-muted/30 via-muted/5 to-transparent p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Hash size={14} className="shrink-0" />
              <span className="font-mono">#{order.id.slice(-8).toUpperCase()}</span>
              <button type="button" onClick={handleCopyId} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Sipariş numarasını kopyala">
                {copiedId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copiedId ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl break-words">
              {order.service.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
                <Sparkles size={11} className="text-sky-500 dark:text-sky-400 font-medium" />
                Sipariş Detayı
              </span>
              <span className="text-xs text-muted-foreground">
                {createdAt.toLocaleString(intlLocale)}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold shadow-xs",
                meta.color,
                meta.bg,
                meta.border,
              )}
            >
              <StatusIcon
                size={14}
                className={cn(order.status === "PROCESSING" && "animate-spin")}
              />
              {meta.label}
            </span>
          </div>
        </div>

        {/* İlerleme Çubuğu */}
        {[
          "PENDING",
          "PROCESSING",
          "COMPLETED",
          "PARTIAL",
        ].includes(order.status) && (
          <div className="mt-6 rounded-2xl border border-border/40 bg-muted/10 p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Teslim İlerlemesi</span>
              <span
                className={cn(
                  "text-xs font-bold",
                  completionPct === 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-primary",
                )}
              >
                {completionPct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  completionPct === 100
                    ? "bg-emerald-500"
                    : "bg-primary",
                )}
                style={{ width: `${completionPct}%` }}
              />
            </div>
            {order.remains > 0 && order.status !== "COMPLETED" && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <span>Kalan: {order.remains.toLocaleString("tr-TR")} adet</span>
                {etaInfo.hasStarted && etaInfo.formattedEta && (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full" title={etaInfo.speedText ?? undefined}>
                    <Clock size={11} className="shrink-0 text-sky-500" />
                    {etaInfo.formattedEta}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {timelineStep !== null && (
          <div className="mt-5 grid grid-cols-4 gap-1" aria-label="Sipariş süreci">
            {timeline.map((step, index) => {
              const done = index <= timelineStep;
              const current = index === timelineStep;
              const StepIcon = step.icon;
              return (
                <div key={step.label} className="relative min-w-0 text-center">
                  {index > 0 && <span className={cn("absolute right-1/2 top-4 h-0.5 w-full", done ? "bg-primary" : "bg-border")} aria-hidden="true" />}
                  <span className={cn("relative z-10 mx-auto grid size-8 place-items-center rounded-full border-2 bg-card", done ? "border-primary text-primary" : "border-border text-muted-foreground", current && "ring-4 ring-primary/10")}>
                    <StepIcon size={14} aria-hidden="true" />
                  </span>
                  <span className={cn("mt-2 block truncate text-[10px] font-medium sm:text-xs", done ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* İki Sütunlu Grid Detay Düzeni */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sol Sütun: Sipariş Bilgileri */}
        <section className="md:col-span-7 rounded-3xl border border-border/50 bg-card p-5 shadow-xs sm:p-6">
          <div className="border-b border-border/40 pb-4">
            <h2 className="text-base font-bold text-foreground">Sipariş Bilgileri</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Temel teslimat ve hedef detayları
            </p>
          </div>

          <div className="divide-y divide-border/30">
            {order.link && (
              <div className="grid grid-cols-[minmax(0,100px)_minmax(0,1fr)] items-start gap-4 py-4">
                <span className="text-xs sm:text-sm text-muted-foreground pt-1.5">Hedef</span>
                <div className="flex items-start gap-2 min-w-0 justify-end">
                  <a
                    href={order.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-right text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline min-w-0 break-all"
                  >
                    <Link2 size={13} className="shrink-0" />
                    <span className="truncate text-left max-w-[180px] sm:max-w-[320px]">
                      {order.link}
                    </span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Linki Kopyala"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-[minmax(0,100px)_minmax(0,1fr)] items-center gap-4 py-4">
              <span className="text-xs sm:text-sm text-muted-foreground">Sipariş Tarihi</span>
              <span className="text-right text-xs sm:text-sm font-medium text-foreground">
                {createdAt.toLocaleString(intlLocale)}
              </span>
            </div>

            <div className="grid grid-cols-[minmax(0,100px)_minmax(0,1fr)] items-center gap-4 py-4">
              <span className="text-xs sm:text-sm text-muted-foreground">Miktar</span>
              <span className="inline-flex items-center justify-end gap-1.5 text-right text-xs sm:text-sm font-medium text-foreground">
                <TrendingUp size={14} className="text-blue-500 dark:text-blue-400" />
                {order.quantity.toLocaleString(intlLocale)}
              </span>
            </div>

            {order.startCount > 0 && (
              <div className="grid grid-cols-[minmax(0,100px)_minmax(0,1fr)] items-center gap-4 py-4">
                <span className="text-xs sm:text-sm text-muted-foreground">Başlangıç Sayısı</span>
                <span className="text-right text-xs sm:text-sm font-medium text-foreground">
                  {order.startCount.toLocaleString(intlLocale)}
                </span>
              </div>
            )}

            {delivered > 0 && (
              <div className="grid grid-cols-[minmax(0,100px)_minmax(0,1fr)] items-center gap-4 py-4">
                <span className="text-xs sm:text-sm text-muted-foreground">Teslim Edilen</span>
                <span className="inline-flex items-center justify-end gap-1.5 text-right text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} className="shrink-0" />
                  {delivered.toLocaleString(intlLocale)}
                </span>
              </div>
            )}

            {order.remains > 0 && order.status !== "COMPLETED" && (
              <div className="grid grid-cols-[minmax(0,100px)_minmax(0,1fr)] items-center gap-4 py-4">
                <span className="text-xs sm:text-sm text-muted-foreground">Kalan</span>
                <span className="inline-flex items-center justify-end gap-1.5 text-right text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
                  <TrendingDown size={14} className="shrink-0" />
                  {order.remains.toLocaleString(intlLocale)}
                </span>
              </div>
            )}

            {etaInfo.hasStarted && etaInfo.formattedEta && (
              <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] items-center gap-4 py-4">
                <span className="text-xs sm:text-sm text-muted-foreground">Tahmini Tamamlama</span>
                <div className="text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 text-right text-xs sm:text-sm font-semibold text-sky-600 dark:text-sky-400">
                    <Clock size={14} className="shrink-0 text-sky-500" />
                    {etaInfo.formattedEta}
                  </span>
                  {etaInfo.speedText && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{etaInfo.speedText}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sağ Sütun: Finansal Detaylar & İşlemler */}
        <div className="md:col-span-5 space-y-6">
          <section className="rounded-3xl border border-border/50 bg-card p-5 shadow-xs sm:p-6">
            <div className="border-b border-border/40 pb-4">
              <h2 className="text-base font-bold text-foreground">Ödeme ve Durum</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Siparişin finansal ve operasyonel özeti
              </p>
            </div>

            <div className="divide-y divide-border/30">
              <div className="grid grid-cols-2 items-center gap-4 py-4">
                <span className="text-xs sm:text-sm text-muted-foreground">Tutar</span>
                <span className="text-right text-sm sm:text-base font-bold text-foreground">
                  {formatMoney(order.charge)}
                </span>
              </div>

              {order.refundedAmount != null && order.refundedAmount > 0 && (
                <div className="grid grid-cols-2 items-center gap-4 py-4">
                  <span className="text-xs sm:text-sm text-muted-foreground">İade</span>
                  <span className="text-right text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">
                    +{formatMoney(order.refundedAmount)}
                  </span>
                </div>
              )}

              {order.lastRefillAt && (
                <div className="grid grid-cols-2 items-center gap-4 py-4">
                  <span className="text-xs sm:text-sm text-muted-foreground">Son Telafi</span>
                  <span className="inline-flex items-center justify-end gap-1.5 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                    <RefreshCw size={12} className="shrink-0" />
                    {new Date(order.lastRefillAt).toLocaleString(intlLocale)}
                  </span>
                </div>
              )}

              {order.cancelledAt && (
                <div className="grid grid-cols-2 items-center gap-4 py-4">
                  <span className="text-xs sm:text-sm text-muted-foreground">İptal Tarihi</span>
                  <span className="inline-flex items-center justify-end gap-1.5 text-right text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                    <Calendar size={12} className="shrink-0" />
                    {new Date(order.cancelledAt).toLocaleString(intlLocale)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Operasyon Notu */}
          {order.error && order.error !== "cancel_requested" && (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                Operasyon Notu
              </h3>
              <p className="mt-2 break-words text-xs sm:text-sm leading-relaxed text-red-700 dark:text-red-200/90 font-medium">
                {order.error}
              </p>
            </div>
          )}

          {/* İşlem Butonları */}
          <section className="sticky top-4 rounded-3xl border border-primary/15 bg-card p-5 shadow-sm sm:p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              İşlemler
            </h3>
            <div className="flex flex-col gap-2 pt-1">
              {isRefillable && (
                <RefillOrderButton orderId={order.id} lastRefillAt={order.lastRefillAt} />
              )}
              {isCancellable && (
                <CancelOrderButton orderId={order.id} chargeLabel={formatMoney(order.charge)} />
              )}
              <OrderSupportButton orderId={order.id} />
            </div>
            <p className="border-t pt-3 text-xs leading-5 text-muted-foreground">
              Siparişinle ilgili bir sorun varsa destek talebi oluşturduğunda sipariş numarası otomatik eklenir.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
