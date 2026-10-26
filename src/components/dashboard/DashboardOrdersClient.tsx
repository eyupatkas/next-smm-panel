"use client";

import { useDeferredValue, useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Grid2X2,
  Headphones,
  Layers3,
  List,
  Loader2,
  Package2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { formatPrice, getCurrencyForLocale, localeToIntlCode } from "@/lib/currency";
import { calculateOrderEta } from "@/lib/services/eta-calculator";
import { cn } from "@/lib/utils";
import { CancelOrderButton } from "@/components/dashboard/CancelOrderButton";
import { OrderSupportButton } from "@/components/dashboard/OrderSupportButton";
import { RefillOrderButton } from "@/components/dashboard/RefillOrderButton";

type DisplayStatus =
  | "ALL"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL"
  | "CANCELED"
  | "REFUNDED"
  | "CANCEL_REQUESTED";

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
  orders: OrderRow[];
};

type SortMode = "NEWEST" | "OLDEST" | "AMOUNT_HIGH" | "PROGRESS_HIGH";
type ViewMode = "GRID" | "COMPACT";
type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

const STATUS_META: Record<Exclude<DisplayStatus, "ALL">, { label: string; icon: typeof Clock; color: string; bg: string; border: string; accent: string }> = {
  PENDING: {
    label: "Bekliyor",
    icon: Clock,
    color: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    accent: "bg-yellow-400",
  },
  PROCESSING: {
    label: "İşlemde",
    icon: Loader2,
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    accent: "bg-sky-400",
  },
  COMPLETED: {
    label: "Tamamlandı",
    icon: CheckCircle2,
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    accent: "bg-emerald-400",
  },
  PARTIAL: {
    label: "Kısmi",
    icon: AlertTriangle,
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    accent: "bg-orange-400",
  },
  CANCELED: {
    label: "İptal",
    icon: XCircle,
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    accent: "bg-red-400",
  },
  REFUNDED: {
    label: "İade",
    icon: RotateCcw,
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    accent: "bg-purple-400",
  },
  CANCEL_REQUESTED: {
    label: "İptal Bekliyor",
    icon: Clock,
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    accent: "bg-amber-400",
  },
};

const STATUS_TABS: { key: DisplayStatus; label: string }[] = [
  { key: "ALL", label: "Tümü" },
  { key: "PENDING", label: "Bekliyor" },
  { key: "PROCESSING", label: "İşlemde" },
  { key: "COMPLETED", label: "Tamamlandı" },
  { key: "PARTIAL", label: "Kısmi" },
  { key: "CANCEL_REQUESTED", label: "İptal Bekliyor" },
  { key: "CANCELED", label: "İptal" },
  { key: "REFUNDED", label: "İade" },
];

function getDisplayStatus(order: OrderRow): Exclude<DisplayStatus, "ALL"> {
  return order.error === "cancel_requested" || order.providerStatus === "CANCEL_REQUESTED"
    ? "CANCEL_REQUESTED"
    : (order.status as Exclude<DisplayStatus, "ALL">);
}

function StatusChip({ status }: { status: Exclude<DisplayStatus, "ALL"> }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
        meta.color,
        meta.bg,
        meta.border,
      )}
    >
      <Icon size={12} className={cn(status === "PROCESSING" && "animate-spin")} />
      {meta.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof Package2;
  tone: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-black text-foreground sm:text-3xl">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={cn("rounded-2xl p-3", tone)}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  locale,
  compact,
}: {
  order: OrderRow;
  locale: string;
  compact: boolean;
}) {
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const formatMoney = (amount: number | null) =>
    amount != null ? formatPrice(amount, currency, intlLocale) : "-";

  const displayStatus = getDisplayStatus(order);
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

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-6 text-foreground sm:text-[15px]">
            {order.service.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full border bg-muted/40 px-2.5 py-1 font-mono">
              #{order.id.slice(-8).toUpperCase()}
            </span>
            <span>
              {createdAt.toLocaleDateString(intlLocale)} {createdAt.toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <StatusChip status={displayStatus} />
      </div>

      <div className={cn("mt-4 grid gap-3", compact ? "grid-cols-3" : "sm:grid-cols-3")}>
        <div className="rounded-xl border bg-muted/25 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Miktar</p>
          <p className="mt-2 text-lg font-black text-foreground">{order.quantity.toLocaleString(intlLocale)}</p>
        </div>
        <div className="rounded-xl border bg-muted/25 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Teslim</p>
          <p className="mt-2 text-lg font-black text-emerald-700 dark:text-emerald-300">{delivered.toLocaleString(intlLocale)}</p>
        </div>
        <div className="rounded-xl border bg-muted/25 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Tutar</p>
          <p className="mt-2 text-lg font-black text-foreground">{formatMoney(order.charge)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-muted/20 p-3.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Teslim ilerlemesi</span>
          <span className={cn("text-xs font-bold", completionPct === 100 ? "text-emerald-700 dark:text-emerald-300" : "text-sky-700 dark:text-sky-300")}>
            {completionPct}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", completionPct === 100 ? "bg-emerald-400" : "bg-sky-400")}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        {order.remains > 0 && order.status !== "COMPLETED" && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-300">
            <span>Kalan: {order.remains.toLocaleString(intlLocale)}</span>
            {etaInfo.hasStarted && etaInfo.formattedEta && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full" title={etaInfo.speedText ?? undefined}>
                <Clock size={11} className="shrink-0 text-sky-400" />
                {etaInfo.formattedEta}
              </span>
            )}
          </div>
        )}
      </div>

      {!compact && <div className="mt-4 flex flex-wrap gap-2">
        {order.service.canRefill && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            Telafi açık
          </span>
        )}
        {order.service.canCancel && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
            İptal uygun
          </span>
        )}
        {order.service.hasDripfeed && (
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300">
            Kademeli
          </span>
        )}
        {order.refundedAmount != null && order.refundedAmount > 0 && (
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-300">
            İade: +{formatMoney(order.refundedAmount)}
          </span>
        )}
      </div>}

      {!compact && order.link && (
        <div className="mt-4 rounded-xl border bg-muted/20 px-3.5 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Hedef</p>
          <a
            href={order.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block truncate text-sm text-primary hover:underline"
          >
            {order.link}
          </a>
        </div>
      )}

      {displayStatus === "CANCEL_REQUESTED" && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-3 text-xs leading-6 text-amber-800 dark:text-amber-200">
          İptal talebiniz sağlayıcıya iletildi. Onaylandığında iade otomatik uygulanır.
        </div>
      )}

      {order.status === "CANCELED" && order.error && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-xs leading-6 text-rose-800 dark:text-rose-200">
          <span className="font-semibold block mb-1">İptal Nedeni:</span>
          {order.error}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <Link
          href={`/${locale}/dashboard/orders/${order.id}`}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/5"
        >
          Detay <ChevronRight size={13} aria-hidden="true" />
        </Link>
        {isRefillable && (
          <RefillOrderButton orderId={order.id} lastRefillAt={order.lastRefillAt} />
        )}
        {isCancellable && (
          <CancelOrderButton orderId={order.id} chargeLabel={formatMoney(order.charge)} />
        )}
        <OrderSupportButton orderId={order.id} />
      </div>
    </article>
  );
}

export function DashboardOrdersClient({ locale, orders }: Props) {
  const [activeTab, setActiveTab] = useState<DisplayStatus>("ALL");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("NEWEST");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("status") === "paid") {
        const stored = localStorage.getItem("last_payment_info");
        if (stored) {
          try {
            const paymentInfo = JSON.parse(stored);
            const gtag = (window as AnalyticsWindow).gtag;
            if (typeof gtag === "function") {
              gtag("event", "purchase", {
                transaction_id: paymentInfo.id || `ORD-${Date.now()}`,
                value: Number(paymentInfo.amount),
                currency: paymentInfo.currency || "TRY",
                items: [
                  {
                    item_name: "Panel Siparişi (Kart)",
                    price: Number(paymentInfo.amount),
                    quantity: 1,
                  }
                ]
              });
              gtag("event", "conversion", {
                send_to: "AW-10832016569/PfY7CML5prscELnpja0o",
                value: Number(paymentInfo.amount),
                currency: paymentInfo.currency || "TRY",
                transaction_id: paymentInfo.id || `ORD-${Date.now()}`
              });
            }
            localStorage.removeItem("last_payment_info");
          } catch (e) {
            console.error("Error parsing last_payment_info:", e);
          }
        }
      }
    }
  }, []);

  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const formatMoney = (amount: number) => formatPrice(amount, currency, intlLocale);

  const counts = useMemo(() => {
    const next: Record<DisplayStatus, number> = {
      ALL: orders.length,
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      PARTIAL: 0,
      CANCELED: 0,
      REFUNDED: 0,
      CANCEL_REQUESTED: 0,
    };

    for (const order of orders) {
      next[getDisplayStatus(order)] += 1;
    }

    return next;
  }, [orders]);

  const filteredOrders = (() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("tr");

    const result = orders.filter((order) => {
      const displayStatus = getDisplayStatus(order);
      if (activeTab !== "ALL" && displayStatus !== activeTab) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        order.service.name,
        order.link ?? "",
        order.id,
        order.id.slice(-8),
      ]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(normalizedQuery);
    });

    return result.sort((a, b) => {
      if (sortMode === "OLDEST") return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      if (sortMode === "AMOUNT_HIGH") return b.charge - a.charge;
      if (sortMode === "PROGRESS_HIGH") {
        return calculateOrderEta(b, locale).progressPercent - calculateOrderEta(a, locale).progressPercent;
      }
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  })();

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.charge), 0),
    [orders],
  );
  const activeCount = useMemo(
    () => orders.filter((order) => ["PENDING", "PROCESSING", "CANCEL_REQUESTED"].includes(getDisplayStatus(order))).length,
    [orders],
  );
  const completedCount = counts.COMPLETED;
  const refundedTotal = useMemo(
    () => orders.reduce((sum, order) => sum + (order.refundedAmount ?? 0), 0),
    [orders],
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_36%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.35))] p-5 shadow-sm sm:p-6">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Sipariş merkezi</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Siparişlerim
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              Siparişlerini tek ekranda izle; teslimat ilerlemesini, iadeleri ve kullanabileceğin işlemleri kolayca yönet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${locale}/dashboard/new-order`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">
              <Plus size={16} aria-hidden="true" /> Yeni sipariş
            </Link>
            <div className="flex h-10 items-center gap-2 rounded-xl border bg-background/70 px-3 text-xs text-muted-foreground">
              <RefreshCw size={14} className="text-primary" /> Son 100 sipariş
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Toplam"
          value={String(orders.length)}
          hint="Görüntülenen tüm siparişler"
          icon={Package2}
          tone="bg-muted text-foreground"
        />
        <StatCard
          title="Aktif"
          value={String(activeCount)}
          hint="Bekleyen ve işlemde olanlar"
          icon={TrendingUp}
          tone="bg-sky-500/15 text-sky-700 dark:text-sky-300"
        />
        <StatCard
          title="Tamamlanan"
          value={String(completedCount)}
          hint="Teslimi biten siparişler"
          icon={CheckCircle2}
          tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        />
        <StatCard
          title="Harcama / İade"
          value={formatMoney(totalSpent)}
          hint={refundedTotal > 0 ? `İade: ${formatMoney(refundedTotal)}` : "Henüz iade yok"}
          icon={BarChart3}
          tone="bg-amber-500/15 text-amber-700 dark:text-amber-300"
        />
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const meta = tab.key === "ALL" ? null : STATUS_META[tab.key];

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {meta ? <span className={cn("h-2 w-2 rounded-full", meta.accent)} /> : <Layers3 size={13} />}
                  {tab.label}
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", isActive ? "bg-primary-foreground/15" : "bg-muted")}>
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="relative min-w-0 flex-1 lg:w-80">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sipariş no, servis veya link ara..."
              aria-label="Siparişlerde ara"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Aramayı temizle" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <label className="relative">
            <span className="sr-only">Sıralama</span>
            <ArrowUpDown size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-11 w-full rounded-xl border bg-background pl-9 pr-8 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-auto">
              <option value="NEWEST">En yeni</option>
              <option value="OLDEST">En eski</option>
              <option value="AMOUNT_HIGH">Tutar: yüksekten</option>
              <option value="PROGRESS_HIGH">İlerleme: yüksekten</option>
            </select>
          </label>
          <div className="flex h-11 items-center rounded-xl border bg-background p-1" aria-label="Görünüm seçimi">
            <button type="button" onClick={() => setViewMode("GRID")} aria-label="Kart görünümü" aria-pressed={viewMode === "GRID"} className={cn("grid size-8 place-items-center rounded-lg transition", viewMode === "GRID" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <Grid2X2 size={15} />
            </button>
            <button type="button" onClick={() => setViewMode("COMPACT")} aria-label="Kompakt görünüm" aria-pressed={viewMode === "COMPACT"} className={cn("grid size-8 place-items-center rounded-lg transition", viewMode === "COMPACT" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <List size={16} />
            </button>
          </div>
          </div>
          </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border bg-muted/30 px-2.5 py-1">
            Görünen: {filteredOrders.length}
          </span>
          <span className="rounded-full border bg-muted/30 px-2.5 py-1">
            Aktif sekme: {STATUS_TABS.find((tab) => tab.key === activeTab)?.label}
          </span>
          {deferredQuery && (
            <span className="rounded-full border bg-muted/30 px-2.5 py-1">
              Arama: {deferredQuery}
            </span>
          )}
        </div>
      </section>

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/15 px-6 py-16 text-center">
          <Headphones size={36} className="mx-auto text-slate-500" />
          <p className="mt-4 text-lg font-semibold text-foreground">Bu filtrede sipariş bulunamadı</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Farklı bir durum sekmesi seçin veya arama metnini temizleyin.
          </p>
          {(activeTab !== "ALL" || query) && (
            <button type="button" onClick={() => { setActiveTab("ALL"); setQuery(""); }} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold text-foreground hover:border-primary/30 hover:bg-primary/5">
              <X size={14} /> Filtreleri temizle
            </button>
          )}
        </div>
      ) : (
        <div className={cn("grid grid-cols-1 gap-4", viewMode === "GRID" && "xl:grid-cols-2")}>
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} locale={locale} compact={viewMode === "COMPACT"} />
          ))}
        </div>
      )}
    </div>
  );
}
