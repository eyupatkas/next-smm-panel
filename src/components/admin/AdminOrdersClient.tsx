"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { syncOrderWithProviderAdmin, syncProviderOrdersBatchAdmin, updateOrderStatusAdmin } from "@/lib/actions/admin-actions";
import ChangeServiceModal from "@/components/admin/ChangeServiceModal";
import {
  Search, RefreshCw, ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
  Link2, User, Package, Hash, AlertCircle, CheckCircle2,
  Loader2, XCircle, ArrowUpRight, Layers, ShoppingBag, Zap, Clock,
  Download, FilterX, Wallet, ReceiptText, TrendingUp, Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";
import { calculateClientCharge, type ClientPricingMode } from "@/lib/client-pricing";
import { calculateOrderEta } from "@/lib/services/eta-calculator";
import { classifyProviderFailure, type ProviderFailureCategory } from "@/lib/services/provider-error";
import { ADMIN_ORDER_PER_PAGE_OPTIONS, type AdminOrderSort } from "@/lib/orders/admin-orders-query";

type OrderStatus = "ALL" | "NOT_SENT" | "PENDING" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "CANCELED" | "REFUNDED";

interface Order {
  id: string;
  serviceId: string;
  packageName: string;
  quantity: number;
  charge: number;
  status: string;
  link: string;
  apiOrderId: string | null;
  error: string | null;
  providerStatus: string | null;
  providerRawStatus: string | null;
  providerSentAt: string | null;
  providerLastCheckedAt: string | null;
  providerSyncError: string | null;
  refundedAmount: number | null;
  startCount: number;
  remains: number;
  createdAt: string;
  costPrice: number;
  costPricingMode: ClientPricingMode;
  retailPrice: number | null;
  resellerPrice: number | null;
  paymentMethod: string | null;
  comboGroupId: string | null;
  comboTotalAmount: number | null;
  comboOrderIds: string[] | null;
  service: {
    name: string;
    externalId: string | null;
    provider: { name: string; status: boolean } | null;
  };
  user: { email: string | null; role: string };
  placedByAgent?: boolean;
}

interface AdminOrdersFilters {
  page: number;
  perPage: number;
  status: string;
  q: string;
  providerId: string;
  from: string | null;
  to: string | null;
  sort: AdminOrderSort;
  source: "all" | "agent" | "manual";
}

interface Props {
  orders: Order[];
  providers: { id: string; name: string }[];
  filters: AdminOrdersFilters;
  pagination: { page: number; perPage: number; total: number; totalPages: number };
  stats: { allTimeTotal: number; sumCharge: number; sumRefunded: number; avgCharge: number };
  statusCounts: Record<string, number>;
  locale: string;
}

const STATUS_TABS: { value: OrderStatus; label: string; dot: string }[] = [
  { value: "ALL",        label: "Tümü",            dot: "bg-slate-400" },
  { value: "NOT_SENT",   label: "Gönderilmedi",     dot: "bg-rose-400" },
  { value: "PENDING",    label: "Bekliyor",         dot: "bg-yellow-400" },
  { value: "PROCESSING", label: "İşlem Sırasında",  dot: "bg-blue-400" },
  { value: "COMPLETED",  label: "Tamamlandı",       dot: "bg-emerald-400" },
  { value: "PARTIAL",    label: "Kısmi",            dot: "bg-orange-400" },
  { value: "CANCELED",   label: "İptal",            dot: "bg-red-400" },
  { value: "REFUNDED",   label: "İade",             dot: "bg-purple-400" },
];

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING:    { label: "Bekliyor",         dot: "bg-yellow-400",  badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  PROCESSING: { label: "İşlem Sırasında",  dot: "bg-blue-400",    badge: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  COMPLETED:  { label: "Tamamlandı",       dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  PARTIAL:    { label: "Kısmi Tamamlandı", dot: "bg-orange-400",  badge: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  CANCELED:   { label: "İptal Edildi",     dot: "bg-red-400",     badge: "bg-red-500/15 text-red-400 border-red-500/20" },
  REFUNDED:   { label: "İade Edildi",      dot: "bg-purple-400",  badge: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
};

const SORT_OPTIONS: { value: AdminOrderSort; label: string }[] = [
  { value: "newest",       label: "En Yeni" },
  { value: "oldest",       label: "En Eski" },
  { value: "charge_desc",  label: "Tutar (Yüksek → Düşük)" },
  { value: "charge_asc",   label: "Tutar (Düşük → Yüksek)" },
  { value: "quantity_desc", label: "Miktar (Yüksek → Düşük)" },
];

const SOURCE_OPTIONS: { value: AdminOrdersFilters["source"]; label: string }[] = [
  { value: "all",    label: "Tüm Kaynaklar" },
  { value: "agent",  label: "Yapay Zeka" },
  { value: "manual", label: "Manuel" },
];

const DATE_PRESETS: { label: string; days: number | "today" | "all" }[] = [
  { label: "Bugün", days: "today" },
  { label: "Son 7 Gün", days: 7 },
  { label: "Son 30 Gün", days: 30 },
  { label: "Son 90 Gün", days: 90 },
  { label: "Tümü", days: "all" },
];

function fmtDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status];
  if (!m) return <span className="text-xs text-slate-400">{status}</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border", m.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

function ProviderStatusBadge({ order }: { order: Order }) {
  if (!order.service.provider) {
    return <span className="text-xs text-slate-500 italic">Manuel</span>;
  }
  if (order.providerSyncError && !order.apiOrderId) {
    const failure = classifyProviderFailure(order.providerSyncError);
    const meta: Record<ProviderFailureCategory, { label: string; className: string }> = {
      CUSTOMER_INPUT: { label: "Kalıcı Ret", className: "bg-red-500/15 text-red-400 border-red-500/20" },
      PROVIDER_BALANCE: { label: "Sağlayıcı Bakiyesi", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
      PROVIDER_CONFIG: { label: "Ayar Gerekli", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
      TRANSIENT: { label: "Yeniden Denenecek", className: "bg-sky-500/15 text-sky-400 border-sky-500/20" },
      AMBIGUOUS: { label: "Kontrol Gerekli", className: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
      UNKNOWN: { label: "İletim Hatası", className: "bg-red-500/15 text-red-400 border-red-500/20" },
    };
    const display = meta[failure.category];
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border", display.className)}>
        <AlertCircle size={11} />{display.label}
      </span>
    );
  }
  if (!order.apiOrderId) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <Loader2 size={11} className="animate-spin" />Kuyruğa Alındı
      </span>
    );
  }
  const meta = order.providerStatus ? STATUS_META[order.providerStatus] : null;
  if (meta) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border", meta.badge)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />{meta.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/20">
      <CheckCircle2 size={11} />İletildi
    </span>
  );
}

function OrderRow({ order, fp }: { order: Order; fp: (n: number) => string }) {
  const [expanded, setExpanded] = useState(false);
  const createdAt = new Date(order.createdAt);
  const etaInfo = calculateOrderEta(order, "tr");
  const deliveryPercent =
    order.remains > 0 && order.quantity > 0
      ? etaInfo.progressPercent
      : order.status === "COMPLETED" ? 100 : null;

  return (
    <>
      <tr
        className={cn(
          "border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] cursor-pointer",
          expanded && "bg-white/[0.03]"
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="py-3 pl-4 pr-2 w-8">
          {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-600" />}
        </td>

        {/* Sipariş No + Tarih */}
        <td className="py-3 pr-4 min-w-[110px]">
          <p className="font-mono text-[11px] font-semibold text-slate-300 tracking-wide">
            {order.id.slice(-8).toUpperCase()}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {createdAt.toLocaleDateString("tr-TR")} {createdAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </td>

        {/* Servis / Link */}
        <td className="py-3 pr-4 max-w-[260px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-slate-200 leading-tight line-clamp-1" title={order.packageName}>
              {order.packageName}
            </p>
            {order.comboGroupId && (
              <span className="inline-flex items-center gap-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-violet-500/20 text-violet-300">
                <Layers size={8} />KOMBO
              </span>
            )}
            {order.placedByAgent && (
              <span className="inline-flex items-center gap-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Zap size={8} className="fill-current animate-pulse text-emerald-400" />YAPAY ZEKA
              </span>
            )}
          </div>
          {order.packageName !== order.service.name && (
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{order.service.name}</p>
          )}
          {order.link && (
            <a
              href={order.link} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-blue-400/80 hover:text-blue-400 mt-0.5 max-w-[220px] truncate"
            >
              <Link2 size={10} />
              <span className="truncate">{order.link.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </td>

        {/* Kullanıcı */}
        <td className="py-3 pr-4">
          <p className="text-xs text-slate-300 truncate max-w-[160px]" title={order.user.email ?? "-"}>
            {order.user.email ?? "-"}
          </p>
          <span className={cn(
            "inline-block mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            order.user.role === "RESELLER" ? "bg-purple-500/20 text-purple-300"
              : order.user.role === "ADMIN" ? "bg-red-500/20 text-red-300"
              : "bg-slate-500/20 text-slate-400"
          )}>
            {order.user.role}
          </span>
        </td>

        {/* Miktar */}
        <td className="py-3 pr-4 text-right tabular-nums">
          <p className="text-sm font-semibold">{order.quantity.toLocaleString("tr-TR")}</p>
          {deliveryPercent !== null && (
            <div className="mt-1" title={etaInfo.formattedEta ? `${etaInfo.formattedEta}${etaInfo.speedText ? ` (${etaInfo.speedText})` : ""}` : undefined}>
              <div className="h-1 w-14 rounded-full bg-white/10 ml-auto">
                <div
                  className={cn("h-1 rounded-full transition-all", deliveryPercent === 100 ? "bg-emerald-400" : "bg-blue-400")}
                  style={{ width: `${deliveryPercent}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-500 text-right mt-0.5">
                {deliveryPercent}%
                {etaInfo.hasStarted && etaInfo.formattedEta && order.status !== "COMPLETED" && (
                  <span className="block text-[9px] text-sky-400 font-medium whitespace-nowrap">
                    {etaInfo.formattedEta.replace("Yaklaşık ", "~")}
                  </span>
                )}
              </p>
            </div>
          )}
        </td>

        {/* Tutar */}
        <td className="py-3 pr-4 text-right">
          <p className={cn("text-sm font-bold tabular-nums", order.charge > 0 && order.charge < 0.01 ? "text-amber-400" : "")}>
            {fp(order.charge)}
          </p>
          {order.refundedAmount != null && order.refundedAmount > 0 && (
            <p className="text-[10px] text-purple-400 mt-0.5">İade: {fp(order.refundedAmount)}</p>
          )}
        </td>

        {/* Sağlayıcı */}
        <td className="py-3 pr-4">
          <div className="space-y-1">
            {order.service.provider && (
              <p className="text-xs font-medium text-slate-300">{order.service.provider.name}</p>
            )}
            {order.apiOrderId ? (
              <p className="text-[11px] text-slate-500 font-mono">#{order.apiOrderId}</p>
            ) : order.service.provider ? (
              <p className="text-[11px] text-amber-500/70">Henüz iletilmedi</p>
            ) : null}
            <ProviderStatusBadge order={order} />
            {order.providerSyncError && !order.apiOrderId && (
              (() => {
                const failure = classifyProviderFailure(order.providerSyncError);
                return (
                  <p
                    className="text-[10px] text-red-400/80 max-w-[220px] line-clamp-2 cursor-help"
                    title={`${failure.message} — ${failure.action} [${failure.code}]`}
                  >
                    {failure.message}
                  </p>
                );
              })()
            )}
          </div>
        </td>

        {/* Durum */}
        <td className="py-3 pr-4">
          <StatusBadge status={order.status} />
        </td>

        {/* İşlemler */}
        <td className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-end gap-1.5">
            {order.service.provider && (
              <form action={syncOrderWithProviderAdmin}>
                <input type="hidden" name="id" value={order.id} />
                <Button type="submit" size="sm" variant="secondary" className="h-7 text-[11px] px-2 gap-1">
                  <RefreshCw size={11} />Senkronla
                </Button>
              </form>
            )}
            {!order.apiOrderId && order.status !== "CANCELED" && order.status !== "REFUNDED" && order.status !== "COMPLETED" && (
              <ChangeServiceModal
                orderId={order.id}
                currentServiceName={order.service.name}
                currentQuantity={order.quantity}
              />
            )}
          </div>
        </td>
      </tr>

      {/* Detay satırı */}
      {expanded && (
        <tr className="border-b border-white/[0.04] bg-white/[0.015]">
          <td colSpan={9} className="px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Sol: Sipariş özeti */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package size={11} />Sipariş Detayı
                </p>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Sipariş ID</span>
                    <span className="font-mono text-slate-300 text-right break-all">{order.id}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Miktar</span>
                    <span>{order.quantity.toLocaleString("tr-TR")}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Tutar</span>
                    <span className="font-semibold">{fp(order.charge)}</span>
                  </div>
                  {/* Ödeme Tipi */}
                  {order.paymentMethod && (
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500 shrink-0">Ödeme Tipi</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                        order.paymentMethod.includes("RETAIL") ? "bg-blue-500/15 text-blue-300" :
                        order.paymentMethod.includes("DASHBOARD") ? "bg-purple-500/15 text-purple-300" :
                        "bg-slate-500/15 text-slate-300"
                      }`}>
                        {order.paymentMethod.includes("RETAIL") ? "PayTR Direkt Satın Alma" :
                         order.paymentMethod.includes("DASHBOARD") ? "PayTR Bakiye+Ödeme" :
                         "Bakiye"}
                      </span>
                    </div>
                  )}
                  {/* Maliyet & Kar/Zarar */}
                  {order.charge > 0 && (() => {
                    const costPerUnit = order.costPrice;
                    const cost = calculateClientCharge(costPerUnit, order.quantity, order.costPricingMode);
                    const profit = Number((order.charge - cost).toFixed(4));
                    const margin = cost > 0 ? Math.round((profit / order.charge) * 100) : null;
                    return (
                      <>
                        <div className="border-t border-white/5 pt-2 mt-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1.5">Maliyet / Kar Analizi</p>
                        </div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-500 shrink-0">Maliyet</span>
                          <span className="text-slate-400">{fp(cost)}</span>
                        </div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-500 shrink-0">Kâr / Zarar</span>
                          <span className={profit >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                            {profit >= 0 ? "+" : ""}{fp(profit)}
                            {margin !== null && <span className="ml-1 text-[10px] opacity-70">({margin}%)</span>}
                          </span>
                        </div>
                        {profit < 0 && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1.5 text-[11px] text-red-400">
                            <AlertCircle size={11} />
                            Zarar tespit edildi — servis fiyatını kontrol edin.
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {order.refundedAmount != null && order.refundedAmount > 0 && (
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-purple-400 shrink-0">İade Edilen</span>
                      <span className="text-purple-400 font-semibold">{fp(order.refundedAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Başlangıç Sayısı</span>
                    <span>{order.startCount.toLocaleString("tr-TR")}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Kalan</span>
                    <span className={order.remains > 0 ? "text-amber-400" : ""}>{order.remains.toLocaleString("tr-TR")}</span>
                  </div>
                  {etaInfo.hasStarted && etaInfo.formattedEta && (
                    <div className="flex justify-between items-start gap-2 pt-1 border-t border-white/5">
                      <span className="text-sky-400 shrink-0 flex items-center gap-1">
                        <Clock size={11} />
                        Tahmini Tamamlanma
                      </span>
                      <div className="text-right">
                        <span className="text-sky-300 font-semibold text-xs">{etaInfo.formattedEta}</span>
                        {etaInfo.speedText && (
                          <p className="text-[10px] text-slate-500">{etaInfo.speedText}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Tarih</span>
                    <span>{createdAt.toLocaleString("tr-TR")}</span>
                  </div>
                </div>
              </div>

              {/* Orta: Link + Sağlayıcı API */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Link2 size={11} />Hedef Bağlantı
                </p>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
                  {order.link ? (
                    <>
                      <p className="text-slate-300 break-all leading-relaxed">{order.link}</p>
                      <a href={order.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-blue-400 hover:underline text-[11px]">
                        <ArrowUpRight size={11} />Bağlantıyı Aç
                      </a>
                    </>
                  ) : (
                    <p className="text-slate-600 italic">Bağlantı belirtilmemiş</p>
                  )}
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mt-2">
                  <Hash size={11} />Sağlayıcı API
                </p>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 text-xs">
                  {order.service.provider ? (
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 shrink-0">Sağlayıcı</span>
                        <span className="font-medium">{order.service.provider.name}</span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 shrink-0">Servis ID</span>
                        <span className="font-mono">{order.service.externalId ?? "—"}</span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 shrink-0">API Sipariş No</span>
                        <span className="font-mono">{order.apiOrderId ?? "—"}</span>
                      </div>
                      {order.providerSentAt && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-500 shrink-0">İletildi</span>
                          <span>{new Date(order.providerSentAt).toLocaleString("tr-TR")}</span>
                        </div>
                      )}
                      {order.providerLastCheckedAt && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-500 shrink-0">Son Kontrol</span>
                          <span>{new Date(order.providerLastCheckedAt).toLocaleString("tr-TR")}</span>
                        </div>
                      )}
                      {order.providerRawStatus && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-500 shrink-0">Ham Durum</span>
                          <span className="font-mono text-slate-400">{order.providerRawStatus}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-600 italic">Manuel sipariş (sağlayıcı yok)</p>
                  )}
                </div>
              </div>

              {/* Sağ: Durum Yönetimi */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User size={11} />Durum Yönetimi
                </p>
                <form id={`ord-${order.id}`} action={updateOrderStatusAdmin} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-3">
                  <input type="hidden" name="id" value={order.id} />
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-500">Sipariş Durumu</label>
                    <select name="status" defaultValue={order.status}
                      className="w-full h-9 rounded-lg border border-white/10 bg-background px-3 text-sm">
                      <option value="PENDING">⏳ Bekliyor</option>
                      <option value="PROCESSING">🔄 İşlem Sırasında</option>
                      <option value="COMPLETED">✅ Tamamlandı</option>
                      <option value="PARTIAL">🔶 Kısmi Tamamlandı</option>
                      <option value="CANCELED">❌ İptal Et (Kısmi İade)</option>
                      <option value="REFUNDED">💜 Tam İade</option>
                    </select>
                  </div>
                  {order.status !== "CANCELED" && order.status !== "REFUNDED" && order.remains > 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
                      İptal edilirse teslim edilmeyen <strong>{order.remains.toLocaleString("tr-TR")}</strong> adet için
                      tahmini <strong>{fp(order.charge * (order.remains / order.quantity))}</strong> iade yapılacak.
                    </div>
                  )}
                  {(order.status === "CANCELED" || order.status === "REFUNDED") && (
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-[11px] text-purple-400">
                      {order.refundedAmount ? `${fp(order.refundedAmount)} iade yapıldı.` : "Bu sipariş zaten iptal/iade statüsünde."}
                    </div>
                  )}
                  <Button type="submit" size="sm" className="w-full h-8 text-xs">Durumu Güncelle</Button>
                </form>

                {(order.error || order.providerSyncError) && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 space-y-1.5">
                    <p className="text-[11px] font-semibold text-red-400 flex items-center gap-1">
                      <AlertCircle size={11} />Hata Bilgisi
                    </p>
                    {order.error && order.error !== "awaiting_payment" && (
                      <p className="text-[11px] text-red-300/80 break-words">{order.error}</p>
                    )}
                    {order.providerSyncError && (() => {
                      const failure = classifyProviderFailure(order.providerSyncError);
                      return (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-red-300">{failure.title}</p>
                          <p className="text-[11px] text-red-300/80 break-words">{failure.message}</p>
                          <p className="text-[10px] text-amber-300/80 break-words">{failure.action}</p>
                          <p className="text-[10px] font-mono text-slate-500 break-all">Teknik kod: {failure.code}</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Kombo Paketi Bilgisi */}
                {order.comboGroupId && order.comboOrderIds && (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-violet-300 flex items-center gap-1.5">
                      <ShoppingBag size={11} />Kombo Paket Satışı
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Toplam Ödeme</span>
                        <span className="text-violet-300 font-semibold">
                          {fp(order.comboTotalAmount ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Kalem Sayısı</span>
                        <span>{order.comboOrderIds.length} sipariş</span>
                      </div>
                      <div className="flex justify-between gap-2 items-start">
                        <span className="text-slate-500 shrink-0">Ödeme ID</span>
                        <span className="font-mono text-[10px] text-slate-400 break-all text-right">{order.comboGroupId.slice(-12).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-white/[0.04] space-y-1">
                      <p className="text-[10px] text-slate-600 uppercase tracking-wide">Kombodaki Diğer Siparişler</p>
                      {order.comboOrderIds.filter((id) => id !== order.id).map((id) => (
                        <div key={id} className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500/50 shrink-0" />
                          {id.slice(-8).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function getPageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

const selectClass = "h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary/50";

export default function AdminOrdersClient({
  orders, providers, filters, pagination, stats, statusCounts, locale,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(filters.q);
  const [lastSyncedQ, setLastSyncedQ] = useState(filters.q);
  const searchInitialized = useRef(false);

  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  // URL oluşturucu: mevcut filtreler + override'lar. null → parametreyi kaldır.
  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams();
    const current: Record<string, string> = {
      status: filters.status !== "ALL" ? filters.status : "",
      q: filters.q,
      provider: filters.providerId,
      from: filters.from ?? "",
      to: filters.to ?? "",
      sort: filters.sort !== "newest" ? filters.sort : "",
      source: filters.source !== "all" ? filters.source : "",
      perPage: filters.perPage !== 50 ? String(filters.perPage) : "",
      page: filters.page > 1 ? String(filters.page) : "",
    };
    for (const [k, v] of Object.entries({ ...current, ...overrides })) {
      const val = (v ?? "").trim();
      if (val) params.set(k, val);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const navigate = (url: string) => {
    startTransition(() => router.push(url, { scroll: false }));
  };

  // Otomatik yenileme
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      startTransition(() => router.refresh());
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [router]);

  // Arama senkronu: prop'tan ilkle, sonrasında debounce ile URL'e yaz
  useEffect(() => {
    if (!searchInitialized.current) {
      searchInitialized.current = true;
      return;
    }
    if (search === filters.q) return;
    const t = window.setTimeout(() => {
      navigate(buildUrl({ q: search, page: null }));
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  // Filtre değişince (ör. URL'den geri/ileri) input'u senkronla
  if (lastSyncedQ !== filters.q) {
    setLastSyncedQ(filters.q);
    setSearch(filters.q);
  }

  const activeDatePreset = useMemo(() => {
    const today = fmtDateParam(new Date());
    if (filters.from === today && filters.to === today) return "today";
    if (!filters.from && !filters.to) return "all";
    return null;
  }, [filters.from, filters.to]);

  const hasActiveFilters =
    filters.status !== "ALL" || !!filters.q || !!filters.providerId ||
    !!filters.from || !!filters.to || filters.source !== "all" ||
    filters.sort !== "newest";

  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.perPage + 1;
  const rangeEnd = Math.min(pagination.page * pagination.perPage, pagination.total);
  const exportHref = buildUrl({ page: null });

  const statCards = [
    { label: "Sipariş (Filtreli)", value: pagination.total.toLocaleString("tr-TR"), sub: `Toplam ${stats.allTimeTotal.toLocaleString("tr-TR")} sipariş`, icon: ReceiptText, tone: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { label: "Toplam Ciro", value: fp(stats.sumCharge), sub: "Filtrelenen siparişler", icon: Wallet, tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Ortalama Tutar", value: fp(stats.avgCharge), sub: "Sipariş başına", icon: TrendingUp, tone: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
    { label: "Toplam İade", value: fp(stats.sumRefunded), sub: "Kısmi + tam iade", icon: Undo2, tone: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Siparişler</h1>
          <p className="text-sm text-slate-500 mt-1">
            {pagination.total.toLocaleString("tr-TR")} sipariş • Sayfa {pagination.page}/{pagination.totalPages} • 30 saniyede bir otomatik yenilenir
          </p>
        </div>
        <a
          href={exportHref}
          download
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 h-9 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <Download size={14} />CSV İndir
        </a>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/[0.06] bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
              <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-lg border", card.tone)}>
                <card.icon size={13} />
              </span>
            </div>
            <p className="text-xl font-bold tracking-tight mt-1.5 tabular-nums">{card.value}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Toplu senkron */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-sm">Toplu Sağlayıcı Senkronu</p>
          <p className="text-xs text-slate-500 mt-0.5">Bekleyen/işlemdeki siparişleri sağlayıcıdan günceller.</p>
        </div>
        <form action={syncProviderOrdersBatchAdmin} className="flex items-center gap-2">
          <input type="number" name="limit" min={1} max={100} defaultValue={25}
            className="h-9 w-20 rounded-md border border-white/10 bg-background px-3 text-sm" />
          <Button type="submit" size="sm" className="gap-1.5 h-9">
            <RefreshCw size={13} />Senkronla
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-card overflow-hidden">
        {/* Durum sekmeleri */}
        <div className="flex flex-wrap border-b border-white/[0.06] px-3 pt-3">
          {STATUS_TABS.map((tab) => (
            <button key={tab.value} onClick={() => navigate(buildUrl({ status: tab.value === "ALL" ? null : tab.value, page: null }))}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-t-lg transition-all relative",
                filters.status === tab.value
                  ? "bg-white/[0.05] text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                  : "text-slate-500 hover:text-slate-300"
              )}>
              {tab.value !== "ALL" && <span className={cn("h-2 w-2 rounded-full", tab.dot)} />}
              {tab.label}
              {statusCounts[tab.value] != null && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] tabular-nums font-semibold",
                  filters.status === tab.value ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-slate-400")}>
                  {statusCounts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filtre çubuğu */}
        <div className="px-4 py-3 border-b border-white/[0.04] space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-400 mr-auto">
              <span className="font-semibold text-white">{pagination.total.toLocaleString("tr-TR")}</span> sipariş
              {pagination.totalPages > 1 && (
                <span className="text-slate-600"> • {rangeStart}–{rangeEnd} gösteriliyor</span>
              )}
            </p>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="e-posta, sipariş no, link, servis…"
                className="pl-9 h-8 text-sm bg-white/[0.03] border-white/[0.08]" />
              {search && (
                <button onClick={() => { setSearch(""); navigate(buildUrl({ q: null, page: null })); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <XCircle size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tarih ön ayarları */}
            <div className="flex items-center gap-1 flex-wrap">
              {DATE_PRESETS.map((preset) => {
                const isActive = preset.days === "all"
                  ? activeDatePreset === "all"
                  : activeDatePreset === preset.days;
                let from: string | null = null;
                let to: string | null = null;
                if (preset.days !== "all") {
                  const now = new Date();
                  to = fmtDateParam(now);
                  if (preset.days === "today") from = to;
                  else {
                    const d = new Date(now);
                    d.setDate(d.getDate() - (preset.days - 1));
                    from = fmtDateParam(d);
                  }
                }
                return (
                  <button
                    key={preset.label}
                    onClick={() => navigate(buildUrl({ from, to, page: null }))}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              <Input type="date" value={filters.from ?? ""} onChange={(e) => navigate(buildUrl({ from: e.target.value || null, page: null }))}
                className="h-8 w-[130px] text-xs bg-white/[0.03] border-white/[0.08]" />
              <span className="text-xs text-slate-600">—</span>
              <Input type="date" value={filters.to ?? ""} onChange={(e) => navigate(buildUrl({ to: e.target.value || null, page: null }))}
                className="h-8 w-[130px] text-xs bg-white/[0.03] border-white/[0.08]" />
            </div>

            <select value={filters.providerId} onChange={(e) => navigate(buildUrl({ provider: e.target.value || null, page: null }))}
              className={selectClass} title="Sağlayıcı filtresi">
              <option value="">Tüm Sağlayıcılar</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select value={filters.source} onChange={(e) => navigate(buildUrl({ source: e.target.value === "all" ? null : e.target.value, page: null }))}
              className={selectClass} title="Kaynak filtresi">
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select value={filters.sort} onChange={(e) => navigate(buildUrl({ sort: e.target.value === "newest" ? null : e.target.value }))}
              className={selectClass} title="Sıralama">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select value={String(filters.perPage)} onChange={(e) => navigate(buildUrl({ perPage: e.target.value === "50" ? null : e.target.value, page: null }))}
              className={selectClass} title="Sayfa başına kayıt">
              {ADMIN_ORDER_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} / sayfa</option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-slate-400 hover:text-white"
                onClick={() => {
                  setSearch("");
                  navigate(pathname);
                }}>
                <FilterX size={12} />Filtreleri Temizle
              </Button>
            )}
          </div>
        </div>

        {/* Tablo */}
        {orders.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            {filters.q ? `"${filters.q}" için sonuç bulunamadı.` : "Bu filtrelerle sipariş yok."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-2.5 pl-4 pr-2 w-8" />
                  <th className="py-2.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Sipariş No</th>
                  <th className="py-2.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Servis / Bağlantı</th>
                  <th className="py-2.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Kullanıcı</th>
                  <th className="py-2.5 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Miktar</th>
                  <th className="py-2.5 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tutar</th>
                  <th className="py-2.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sağlayıcı API</th>
                  <th className="py-2.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Durum</th>
                  <th className="py-2.5 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} fp={fp} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sayfalama */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.04]">
            <p className="text-xs text-slate-500">
              <span className="text-slate-300 font-medium">{rangeStart}–{rangeEnd}</span> / {pagination.total.toLocaleString("tr-TR")} sipariş
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page <= 1}
                onClick={() => navigate(buildUrl({ page: "1" }))} title="İlk sayfa">
                <ChevronsLeft size={14} />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page <= 1}
                onClick={() => navigate(buildUrl({ page: String(pagination.page - 1) }))} title="Önceki sayfa">
                <ChevronLeft size={14} />
              </Button>
              {getPageItems(pagination.page, pagination.totalPages).map((item, idx) =>
                item === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-600 select-none">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => navigate(buildUrl({ page: String(item) }))}
                    className={cn(
                      "h-8 min-w-8 rounded-md px-2 text-xs font-medium transition-colors",
                      item === pagination.page
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page >= pagination.totalPages}
                onClick={() => navigate(buildUrl({ page: String(pagination.page + 1) }))} title="Sonraki sayfa">
                <ChevronRight size={14} />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page >= pagination.totalPages}
                onClick={() => navigate(buildUrl({ page: String(pagination.totalPages) }))} title="Son sayfa">
                <ChevronsRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
