"use client";

import { useMemo, useState, useCallback } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardPayTRDialog } from "@/components/dashboard/DashboardPayTRDialog";
import { FavoriteToggleButton } from "@/components/shared/FavoriteToggleButton";
import {
  Search,
  ShoppingCart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Wallet,
  CreditCard,
  Layers,
  Zap,
  ChevronRight as Arrow,
} from "lucide-react";
import { getPlatformIcon, getPlatformColor } from "@/lib/platform-icons";
import { calculateClientCharge, unitPriceSuffix } from "@/lib/client-pricing";

/* ─── Types ──────────────────────────────────────────────── */

type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  min: number;
  max: number;
  unitPrice: number;
  pricingMode?: "PER_THOUSAND" | "PER_UNIT";
  categoryId: string;
  categoryName: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  providerCode?: string | null;
  avgCompletionMinutes?: number | null;
  linkFormat?: string | null;
};

type Props = {
  services: ServiceItem[];
  userBalance?: number;
};

type CheckoutResponse = {
  status: "created" | "payment_required";
  message: string;
  totalAmount: number;
  usedBalance: number;
  remainingAmount: number;
  orderIds: string[];
  token?: string;
};

type Phase = "platform" | "category" | "list";

/* ─── Yardımcılar ────────────────────────────────────────── */

function fmtSpeed(mins: number, t: any): string {
  if (mins < 60) return `~${Math.round(mins)} ${t("speedMins") || "dk"}`;
  if (mins < 1440) return `~${Math.round(mins / 60)} ${t("speedHours") || "saat"}`;
  return t("speedDay") || "24+ saat";
}

const PROVIDER_BADGE: Record<string, string> = {
  S1: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  S2: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  S3: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  S4: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  S5: "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

function catalogKey(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ─── ServiceCard ────────────────────────────────────────── */
function ServiceCard({
  service,
  fp,
  onBuy,
}: {
  service: ServiceItem;
  fp: (n: number) => string;
  onBuy: (s: ServiceItem) => void;
}) {
  const t = useTranslations("servicesPage");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 lg:flex-row lg:items-center hover:border-white/20 hover:bg-white/[0.05] transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {service.providerCode && (
            <span
              className={cn(
                "shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold leading-none border",
                PROVIDER_BADGE[service.providerCode] ?? "bg-white/10 text-muted-foreground border-white/10",
              )}
            >
              {service.providerCode}
            </span>
          )}
          <p className="text-sm font-medium leading-snug">{service.name}</p>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{t("min")}: {service.min.toLocaleString()}</span>
          <span>{t("max")}: {service.max.toLocaleString()}</span>
          {service.avgCompletionMinutes != null && (
            <span className="text-emerald-400 flex items-center gap-1">
              <Zap size={10} />
              {t("speed", { speed: fmtSpeed(service.avgCompletionMinutes, t) })}
            </span>
          )}
        </div>
        {service.description && (
          <p className="mt-1.5 text-[11px] text-muted-foreground/70 line-clamp-2">{service.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 lg:justify-end">
        <div className="text-left lg:text-right">
          <p className="text-sm font-bold text-primary">{fp(service.unitPrice)}</p>
          <p className="text-xs text-muted-foreground">
            {service.pricingMode === "PER_UNIT" ? (t("unitPriceSuffixUnit") || "/ adet") : (t("unitPriceSuffixThousand") || "/ 1000 adet")}
          </p>
        </div>
        <FavoriteToggleButton serviceId={service.id} className="h-9 w-9 shrink-0 rounded-lg" />
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => onBuy(service)}>
          <ShoppingCart size={14} /> {t("buy")}
        </Button>
      </div>
    </div>
  );
}

/* ─── Ana Bileşen ────────────────────────────────────────── */
export function ServiceListBrowser({ services, userBalance = 0 }: Props) {
  const { format: fp } = useCurrency();
  const t = useTranslations("servicesPage");
  const locale = useLocale();

  // Navigasyon
  const [phase, setPhase] = useState<Phase>("platform");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "name">("price");
  const [pagination, setPagination] = useState({ key: "", page: 1 });

  // Satın alma
  const [buyService, setBuyService] = useState<ServiceItem | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [paytrMessage, setPaytrMessage] = useState<string | null>(null);

  /* ─── Platform Listesi ──────────────────────────────────── */
  const platformList = useMemo(() => {
    const map = new Map<string, { name: string; key: string; count: number }>();
    for (const svc of services) {
      const name = svc.parentCategoryName || svc.categoryName;
      const key = catalogKey(name);
      if (!map.has(key)) map.set(key, { name, key, count: 0 });
      map.get(key)!.count++;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [services]);

  /* ─── Kategori Listesi ──────────────────────────────────── */
  const categoryList = useMemo(() => {
    const map = new Map<string, { name: string; key: string; count: number }>();
    for (const svc of services) {
      const platformName = svc.parentCategoryName || svc.categoryName;
      const platformKey = catalogKey(platformName);
      if (selectedPlatform !== "ALL" && platformKey !== selectedPlatform) continue;
      const key = catalogKey(svc.categoryName);
      if (!map.has(key)) map.set(key, { name: svc.categoryName, key, count: 0 });
      map.get(key)!.count++;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [services, selectedPlatform]);

  /* ─── Filtrelenmiş Servisler ────────────────────────────── */
  const filteredServices = useMemo(() => {
    let list = services;
    if (selectedPlatform && selectedPlatform !== "ALL") {
      list = list.filter(
        (svc) => catalogKey(svc.parentCategoryName || svc.categoryName) === selectedPlatform,
      );
    }
    if (selectedCategory && selectedCategory !== "ALL") {
      list = list.filter((svc) => catalogKey(svc.categoryName) === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (svc) =>
          svc.name.toLowerCase().includes(q) ||
          svc.categoryName.toLowerCase().includes(q) ||
          (svc.parentCategoryName ?? "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) =>
      sortBy === "price" ? a.unitPrice - b.unitPrice : a.name.localeCompare(b.name),
    );
  }, [services, selectedPlatform, selectedCategory, search, sortBy]);

  const pageSize = 40;
  const queryKey = `${selectedPlatform}:${selectedCategory}:${search.trim().toLowerCase()}:${sortBy}`;
  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  const currentPage = Math.min(pagination.key === queryKey ? pagination.page : 1, totalPages);
  const pagedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [currentPage, filteredServices]);

  /* ─── Gruplandırma ──────────────────────────────────────── */
  const groupedServices = useMemo(() => {
    const platformMap = new Map<
      string,
      { id: string; name: string; categories: Map<string, { id: string; name: string; services: ServiceItem[] }> }
    >();
    for (const svc of pagedServices) {
      const platformName = svc.parentCategoryName || svc.categoryName;
      const platformKey = catalogKey(platformName);
      if (!platformMap.has(platformKey)) {
        platformMap.set(platformKey, { id: platformKey, name: platformName, categories: new Map() });
      }
      const plat = platformMap.get(platformKey)!;
      const catKey = catalogKey(svc.categoryName);
      if (!plat.categories.has(catKey)) {
        plat.categories.set(catKey, { id: catKey, name: svc.categoryName, services: [] });
      }
      plat.categories.get(catKey)!.services.push(svc);
    }
    return Array.from(platformMap.values());
  }, [pagedServices]);

  /* ─── Navigasyon ─────────────────────────────────────────── */
  const goToPlatform = useCallback(() => {
    setPhase("platform");
    setSelectedPlatform(null);
    setSelectedCategory(null);
    setSearch("");
  }, []);

  const selectPlatform = useCallback((key: string) => {
    setSelectedPlatform(key);
    if (key === "ALL") {
      setSelectedCategory("ALL");
      setPhase("list");
    } else {
      setSelectedCategory(null);
      setPhase("category");
    }
    setSearch("");
    setPagination({ key: "", page: 1 });
  }, []);

  const selectCategory = useCallback((key: string) => {
    setSelectedCategory(key);
    setPhase("list");
    setPagination({ key: "", page: 1 });
  }, []);

  const goToCategory = useCallback(() => {
    if (selectedPlatform && selectedPlatform !== "ALL") {
      setPhase("category");
      setSelectedCategory(null);
    } else {
      goToPlatform();
    }
  }, [selectedPlatform, goToPlatform]);

  /* ─── Satın Alma ─────────────────────────────────────────── */
  const quantityNum = parseInt(quantity) || 0;
  const buyPrice = buyService
    ? calculateClientCharge(buyService.unitPrice, quantityNum, buyService.pricingMode)
    : 0;
  const willUseBalance = Math.min(userBalance, buyPrice);
  const remainingForPayTR = Math.max(buyPrice - userBalance, 0);

  const openBuyModal = (svc: ServiceItem) => {
    setBuyService(svc);
    setQuantity(String(svc.min));
    setLink("");
    setError(null);
    setSuccess(null);
  };

  async function handleBuySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!buyService || !link.trim() || quantityNum <= 0) {
      setError(t("requiredError"));
      return;
    }
    if (buyService.linkFormat === "USERNAME" && /^https?:\/\//i.test(link.trim())) {
      setError(t("usernameError"));
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/checkout/dashboard-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "single", serviceId: buyService.id, link: link.trim(), quantity: quantityNum }),
      });
      const data = (await response.json()) as CheckoutResponse & { error?: string };
      if (!response.ok) { setError(data.error ?? "Satın alma başlatılamadı."); return; }
      setSuccess(data.message);
      if (data.status === "payment_required" && data.token) {
        setPaytrToken(data.token);
        setPaytrMessage(data.message);
      } else {
        setLink("");
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  /* ─── Arama modu ─────────────────────────────────────────── */
  const isSearchMode = search.trim().length > 0;
  const effectivePhase: Phase = isSearchMode ? "list" : phase;

  /* ─── Platform Seçim Ekranı ──────────────────────────────── */
  if (effectivePhase === "platform") {
    return (
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchAllPlaceholder")}
            className="h-11 w-full rounded-xl border border-white/10 bg-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-1">{t("selectPlatform")}</h2>
          <p className="text-xs text-muted-foreground/60 mb-4">{t("selectPlatformDesc")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <button
              onClick={() => selectPlatform("ALL")}
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition-all text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
                <Layers size={22} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("allPlatforms")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("servicesCount", { count: services.length })}</p>
              </div>
            </button>
            {platformList.map((platform) => (
              <button
                key={platform.key}
                onClick={() => selectPlatform(platform.key)}
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-card p-4 hover:border-white/25 hover:bg-white/5 transition-all text-center"
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl border bg-gradient-to-br flex items-center justify-center",
                  getPlatformColor(platform.name),
                )}>
                  {getPlatformIcon(platform.name, "lg")}
                </div>
                <div>
                  <p className="text-sm font-semibold truncate max-w-[120px]">{platform.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("servicesCount", { count: platform.count })}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Kategori Seçim Ekranı ──────────────────────────────── */
  if (effectivePhase === "category") {
    const currentPlatformName = platformList.find((p) => p.key === selectedPlatform)?.name ?? "";
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchAllPlaceholder")}
              className="h-11 w-full rounded-xl border border-white/10 bg-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={goToPlatform} className="text-muted-foreground hover:text-foreground transition-colors">
              {t("platformHeader")}
            </button>
            <Arrow size={12} className="text-muted-foreground/40" />
            <span className="text-slate-200 font-medium">{currentPlatformName}</span>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t("selectCategory")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <button
              onClick={() => selectCategory("ALL")}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-card px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                <Layers size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("allCategories")}</p>
                <p className="text-xs text-muted-foreground">{t("servicesCount", { count: categoryList.reduce((s, c) => s + c.count, 0) })}</p>
              </div>
              <Arrow size={14} className="ml-auto text-muted-foreground/40" />
            </button>
            {categoryList.map((cat) => (
              <button
                key={cat.key}
                onClick={() => selectCategory(cat.key)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-card px-4 py-3 hover:border-white/20 hover:bg-white/5 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                  {cat.count}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{t("servicesCount", { count: cat.count })}</p>
                </div>
                <Arrow size={14} className="ml-auto text-muted-foreground/40 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Servis Listesi ──────────────────────────────────────── */
  const selectedPlatformName =
    selectedPlatform === "ALL" ? t("allPlatforms") : platformList.find((p) => p.key === selectedPlatform)?.name ?? "";
  const selectedCategoryName =
    selectedCategory === "ALL" ? t("allCategories") : categoryList.find((c) => c.key === selectedCategory)?.name ?? "";

  return (
    <div className="space-y-4">
      {/* Araç çubuğu */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-lg border border-white/10 bg-card pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={() => setSortBy(sortBy === "name" ? "price" : "name")}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-card px-3 text-xs text-muted-foreground hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            {sortBy === "name" ? "A–Z" : (locale === "tr" ? "Fiyat ↑" : "Price ↑")}
          </button>
        </div>
        {!isSearchMode && (
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button onClick={goToPlatform} className="text-muted-foreground hover:text-foreground transition-colors">
              {t("platformHeader")}
            </button>
            {selectedPlatform !== "ALL" && (
              <>
                <Arrow size={12} className="text-muted-foreground/40" />
                <button onClick={goToCategory} className="text-muted-foreground hover:text-foreground transition-colors">
                  {selectedPlatformName}
                </button>
              </>
            )}
            <Arrow size={12} className="text-muted-foreground/40" />
            <span className="text-slate-200 font-medium">{selectedCategoryName}</span>
          </div>
        )}
      </div>

      {/* Sonuç bilgisi */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {isSearchMode ? (
            <p>{t("resultsCount", { search, count: filteredServices.length })}</p>
          ) : (
            <p>{t("servicesCount", { count: filteredServices.length })}</p>
          )}
        </div>
        {totalPages > 1 && <p>{t("pageCount", { current: currentPage, total: totalPages })}</p>}
      </div>

      {/* Servis grupları */}
      <div className="space-y-4">
        {groupedServices.map((platform) => (
          <Card key={platform.id} className="overflow-hidden border-white/10">
            <div className="border-b border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-muted-foreground">
                  {getPlatformIcon(platform.name, "md")}
                </span>
                <div>
                  <p className="text-sm font-semibold">{platform.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("servicesCount", { count: Array.from(platform.categories.values()).reduce((s, c) => s + c.services.length, 0) })}
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {Array.from(platform.categories.values()).map((category) => (
                <div key={category.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">{category.name}</h3>
                    <span className="text-xs text-muted-foreground">{t("servicesCount", { count: category.services.length })}</span>
                  </div>
                  <div className="space-y-2">
                    {category.services.map((svc) => (
                      <ServiceCard key={svc.id} service={svc} fp={fp} onBuy={openBuyModal} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {groupedServices.length === 0 && (
          <Card className="border-white/10 px-6 py-12 text-center text-sm text-muted-foreground">
            {isSearchMode
              ? <><Search size={20} className="mx-auto mb-2 text-muted-foreground/40" />{t("resultsCount", { search, count: 0 })}</>
              : t("noServices")}
          </Card>
        )}
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button" variant="outline" size="sm"
            disabled={currentPage === 1}
            onClick={() => setPagination({ key: queryKey, page: Math.max(1, currentPage - 1) })}
          >
            <ChevronLeft size={14} className="mr-1" /> {t("prevPage")}
          </Button>
          <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </div>
          <Button
            type="button" variant="outline" size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setPagination({ key: queryKey, page: Math.min(totalPages, currentPage + 1) })}
          >
            {t("nextPage")} <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      )}

      {/* Satın alma modalı */}
      <Dialog open={Boolean(buyService)} onOpenChange={(open) => { if (!open) setBuyService(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("quickBuy")}</DialogTitle>
          </DialogHeader>
          {buyService && (
            <form onSubmit={handleBuySubmit} className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  {buyService.providerCode && (
                    <span className={cn(
                      "shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold leading-none border",
                      PROVIDER_BADGE[buyService.providerCode] ?? "bg-white/10 text-muted-foreground border-white/10",
                    )}>
                      {buyService.providerCode}
                    </span>
                  )}
                  <p className="text-sm font-medium">{buyService.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fp(buyService.unitPrice)} {buyService.pricingMode === "PER_UNIT" ? t("unitPriceSuffixUnit") : t("unitPriceSuffixThousand")} - {t("min")}: {buyService.min} - {t("max")}: {buyService.max.toLocaleString()}
                  {buyService.avgCompletionMinutes != null && (
                    <span className="text-emerald-400 ml-2">
                      · <Zap size={10} className="inline" /> {t("speed", { speed: fmtSpeed(buyService.avgCompletionMinutes, t) })}
                    </span>
                  )}
                </p>
              </div>

              {error && <p className="rounded bg-red-500/10 p-2 text-sm text-red-400">{error}</p>}
              {success && <p className="rounded bg-emerald-500/10 p-2 text-sm text-emerald-400">{success}</p>}

              <div className="space-y-1.5">
                <Label>{buyService.linkFormat === "USERNAME" ? t("username") : t("link")}</Label>
                {buyService.linkFormat === "USERNAME" && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                    <span>{t("usernameWarning")}</span>
                  </div>
                )}
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder={buyService.linkFormat === "USERNAME" ? "@kanaladi" : "https://..."} required />
              </div>

              <div className="space-y-1.5">
                <Label>{t("quantity")}</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={buyService.min} max={buyService.max} required />
                <p className="text-xs text-muted-foreground">{t("min")}: {buyService.min.toLocaleString()} — {t("max")}: {buyService.max.toLocaleString()}</p>
              </div>

              {quantityNum > 0 && (
                <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{t("totalAmount")}</p>
                    <p className="text-xl font-bold text-primary">{fp(buyPrice)}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Wallet size={14} /> {t("availableBalance")}</span>
                    <span className="font-semibold">{fp(userBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("balanceUsed")}</span>
                    <span className="font-semibold text-emerald-400">{fp(willUseBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><CreditCard size={14} /> {t("paytrAmount")}</span>
                    <span className="font-semibold text-amber-400">{fp(remainingForPayTR)}</span>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="animate-spin" size={16} /> {t("processing")}</>
                ) : remainingForPayTR > 0 ? (
                  <><CreditCard size={16} /> {t("buyCombo")}</>
                ) : (
                  <><ShoppingCart size={16} /> {t("buy")}</>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <DashboardPayTRDialog
        open={Boolean(paytrToken)}
        token={paytrToken}
        title={t("orderTitle")}
        description={paytrMessage ?? undefined}
        successRedirect="/dashboard/orders"
        onClose={() => setPaytrToken(null)}
      />
    </div>
  );
}
