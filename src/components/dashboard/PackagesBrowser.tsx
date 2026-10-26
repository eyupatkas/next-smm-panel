"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Package,
  ShoppingBag,
  CheckCircle2,
  Loader2,
  Wallet,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteToggleButton } from "@/components/shared/FavoriteToggleButton";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import { useTranslations } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────
type PlatformItem = {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
};

type PackageItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  categoryId: string;
  categoryName: string;
  platformId: string;
  platformName: string;
  platformIcon: string | null;
  serviceId: string;
  serviceMin: number;
  serviceMax: number;
};

type Props = {
  platforms: PlatformItem[];
  packages: PackageItem[];
  userBalance: number;
};

// ─── Platform icon mapping ─────────────────────────────────────────────────
const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "▶️",
  twitter: "𝕏",
  "twitter / x": "𝕏",
  facebook: "📘",
  telegram: "✈️",
  spotify: "🎧",
  twitch: "🟣",
  discord: "💬",
  linkedin: "💼",
  pinterest: "📌",
  snapchat: "👻",
  reddit: "🤖",
};

function getPlatformEmoji(name: string, icon: string | null): string {
  if (icon && !icon.startsWith("/") && icon.length <= 4) return icon;
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(PLATFORM_ICONS)) {
    if (lower.includes(key)) return emoji;
  }
  return "📱";
}

// ─── Format price ─────────────────────────────────────────────────────────
function fmt(price: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

// ─── Quantity format ───────────────────────────────────────────────────────
function fmtQty(qty: number): string {
  if (qty >= 1_000_000) return `${(qty / 1_000_000).toFixed(1)}M`;
  if (qty >= 1_000) return `${(qty / 1_000).toFixed(0)}K`;
  return qty.toLocaleString("tr-TR");
}

// ─── Purchase Modal ────────────────────────────────────────────────────────
type ModalState =
  | { phase: "idle" }
  | { phase: "form"; pkg: PackageItem }
  | { phase: "loading" }
  | { phase: "success"; orderId: string; packageName: string; charge: number }
  | { phase: "error"; message: string };

function PurchaseModal({
  state,
  userBalance,
  onClose,
  onConfirm,
  onRetry,
  fp,
  t,
}: {
  state: ModalState;
  userBalance: number;
  onClose: () => void;
  onConfirm: (link: string) => void;
  onRetry: () => void;
  fp: (n: number) => string;
  t: any;
}) {
  const [link, setLink] = useState("");

  if (state.phase === "idle") return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl shadow-sky-500/10 overflow-hidden">
        {/* Loading */}
        {state.phase === "loading" && (
          <div className="flex flex-col items-center justify-center gap-4 p-12">
            <Loader2 size={40} className="animate-spin text-sky-400" />
            <p className="text-sm text-muted-foreground">{t("ordering") || "Sipariş oluşturuluyor…"}</p>
          </div>
        )}

        {/* Success */}
        {state.phase === "success" && (
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-semibold">{t("successTitle") || "Sipariş Oluşturuldu!"}</p>
              <p className="text-sm text-muted-foreground mt-1">{state.packageName}</p>
              <p className="text-xl font-bold text-emerald-400 mt-3">{fp(state.charge)}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("usedFromBalance") || "bakiyenizden düşüldü"}</p>
            </div>
            <Button className="w-full mt-2" onClick={onClose}>
              {t("ok") || "Tamam"}
            </Button>
          </div>
        )}

        {/* Error */}
        {state.phase === "error" && (
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 ring-2 ring-red-500/30">
              <Package size={28} className="text-red-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-red-400">{t("error") || "Hata"}</p>
              <p className="text-sm text-muted-foreground mt-1">{state.message}</p>
            </div>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {t("close") || "Kapat"}
              </Button>
              <Button className="flex-1" onClick={onRetry}>
                {t("retry") || "Tekrar Dene"}
              </Button>
            </div>
          </div>
        )}

        {/* Form */}
        {state.phase === "form" && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500/15 to-fuchsia-500/10 border-b border-white/10 px-6 py-5">
              <p className="text-xs text-sky-400 font-semibold uppercase tracking-wide">
                {state.pkg.platformName} › {state.pkg.categoryName}
              </p>
              <h3 className="text-base font-bold mt-1">{state.pkg.name}</h3>
              <div className="flex items-center gap-3 mt-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                  {t("quantityAction", { count: state.pkg.quantity }) || `${fmtQty(state.pkg.quantity)} işlem`}
                </span>
                <span className="text-lg font-bold text-sky-400">{fp(state.pkg.price)}</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Balance check */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Wallet size={14} />
                  {t("balance") || "Bakiye"}
                </span>
                <span className={cn(
                  "font-semibold",
                  userBalance >= state.pkg.price ? "text-emerald-400" : "text-red-400"
                )}>
                  {fp(userBalance)}
                </span>
              </div>

              {userBalance < state.pkg.price && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {t("insufficientBalanceDesc") || "Yetersiz bakiye. Lütfen bakiye yükleyin."}
                </div>
              )}

              {/* Link input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("linkLabel") || "Profil / Gönderi Linki"}
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {t("linkDesc", { platform: state.pkg.platformName }) || `${state.pkg.platformName} profil ya da gönderi linkini girin.`}
                </p>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 px-4 py-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("packageLabel") || "Paket"}</span>
                  <span className="font-medium">{t("quantityAction", { count: state.pkg.quantity }) || `${fmtQty(state.pkg.quantity)} işlem`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("totalLabel") || "Toplam"}</span>
                  <span className="font-bold text-sky-400">{fp(state.pkg.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("remainingBalance") || "Kalan Bakiye"}</span>
                  <span className={cn(
                    "font-medium",
                    userBalance - state.pkg.price >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {fp(Math.max(userBalance - state.pkg.price, 0))}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  {t("cancel") || "Vazgeç"}
                </Button>
                <Button
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white"
                  disabled={!link.trim() || userBalance < state.pkg.price}
                  onClick={() => onConfirm(link.trim())}
                >
                  <ShoppingBag size={15} className="mr-1.5" />
                  {t("buyNow") || "Satın Al"} — {fp(state.pkg.price)}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Package Card ──────────────────────────────────────────────────────────
function PackageCard({
  pkg,
  userBalance,
  onBuy,
  fp,
  t,
}: {
  pkg: PackageItem;
  userBalance: number;
  onBuy: (pkg: PackageItem) => void;
  fp: (n: number) => string;
  t: any;
}) {
  const canAfford = userBalance >= pkg.price;

  return (
    <div className={cn(
      "group relative flex flex-col rounded-2xl border bg-gradient-to-br transition-all duration-200 overflow-hidden",
      canAfford
        ? "border-white/10 from-white/[0.03] to-white/[0.01] hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-500/10 hover:translate-y-[-2px]"
        : "border-white/5 from-white/[0.02] to-transparent opacity-70"
    )}>
      {/* Quantity badge */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span className="rounded-full bg-sky-500/15 border border-sky-500/20 px-2.5 py-0.5 text-xs font-semibold text-sky-400 tabular-nums">
          {t("quantityAction", { count: pkg.quantity }) || `${fmtQty(pkg.quantity)} işlem`}
        </span>
        <FavoriteToggleButton serviceId={pkg.serviceId} className="h-8 w-8 rounded-lg border-sky-500/20 bg-sky-500/10 text-sky-300 hover:bg-sky-500/15" />
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Name */}
        <div className="pr-28">
          <p className="text-sm font-semibold leading-snug line-clamp-2">{pkg.name}</p>
          {pkg.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
          )}
        </div>

        {/* Price */}
        <div className="mt-auto">
          <p className="text-2xl font-bold text-sky-400 tabular-nums">{fp(pkg.price)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("quantityAction", { count: pkg.quantity }) || `${fmtQty(pkg.quantity)} işlem`}
          </p>
        </div>
      </div>

      {/* Buy button */}
      <div className="px-5 pb-5">
        <Button
          className={cn(
            "w-full gap-2 font-semibold transition-all",
            canAfford
              ? "bg-sky-500 hover:bg-sky-600 text-white"
              : "bg-white/5 text-muted-foreground cursor-not-allowed"
          )}
          disabled={!canAfford}
          onClick={() => canAfford && onBuy(pkg)}
        >
          {canAfford ? (
            <>
              <ShoppingBag size={15} />
              {t("buyNow") || "Satın Al"}
            </>
          ) : (
            <>
              <Wallet size={15} />
              {t("insufficientBalance") || "Yetersiz Bakiye"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export function PackagesBrowser({ platforms, packages, userBalance }: Props) {
  const { format: fp } = useCurrency();
  const t = useTranslations("packagesPage");

  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(
    platforms[0]?.id ?? null
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ phase: "idle" });
  const [lastPkg, setLastPkg] = useState<PackageItem | null>(null);

  // Categories for selected platform
  const categories = useMemo(() => {
    if (!selectedPlatformId) return [];
    const catMap = new Map<string, { id: string; name: string; count: number }>();
    for (const pkg of packages) {
      if (pkg.platformId !== selectedPlatformId) continue;
      if (!catMap.has(pkg.categoryId)) {
        catMap.set(pkg.categoryId, { id: pkg.categoryId, name: pkg.categoryName, count: 0 });
      }
      catMap.get(pkg.categoryId)!.count++;
    }
    return Array.from(catMap.values());
  }, [selectedPlatformId, packages]);

  // Auto-select first category when platform changes
  const handlePlatformSelect = useCallback((id: string) => {
    setSelectedPlatformId(id);
    setSelectedCategoryId(null);
    setSearch("");
  }, []);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (selectedPlatformId && pkg.platformId !== selectedPlatformId) return false;
      if (selectedCategoryId && pkg.categoryId !== selectedCategoryId) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !pkg.name.toLowerCase().includes(q) &&
          !pkg.categoryName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [packages, selectedPlatformId, selectedCategoryId, search]);

  // Stats
  const platformPkgCount = useMemo(
    () => packages.filter((p) => p.platformId === selectedPlatformId).length,
    [packages, selectedPlatformId]
  );

  // Purchase handlers
  function handleBuy(pkg: PackageItem) {
    setLastPkg(pkg);
    setModal({ phase: "form", pkg });
  }

  async function handleConfirm(link: string) {
    if (!lastPkg) return;
    setModal({ phase: "loading" });

    try {
      const res = await fetch("/api/checkout/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: lastPkg.id, link }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; orderId?: string; charge?: number; message?: string };

      if (!res.ok || !data.ok) {
        setModal({ phase: "error", message: data.error ?? "Bir hata oluştu." });
        return;
      }

      setModal({
        phase: "success",
        orderId: data.orderId ?? "",
        packageName: lastPkg.name,
        charge: data.charge ?? lastPkg.price,
      });

      toast.success("Sipariş oluşturuldu!");
    } catch {
      setModal({ phase: "error", message: t("genericError") || "Bir hata oluştu. Lütfen tekrar deneyin." });
    }
  }

  function handleCloseModal() {
    if (modal.phase === "loading") return;
    setModal({ phase: "idle" });
  }

  const selectedPlatform = platforms.find((p) => p.id === selectedPlatformId);

  return (
    <>
      <div className="min-h-screen space-y-0">
        {/* ── Hero Header ────────────────────────────────────────────────── */}
        <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.7))] p-6 shadow-2xl shadow-sky-500/10 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sky-300 flex items-center gap-2">
                <Sparkles size={11} /> {t("title")}
              </p>
              <h1 className="text-3xl font-bold tracking-tight mt-1">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center">
                <p className="text-xs text-muted-foreground">{t("balance") || "Bakiye"}</p>
                <p className="text-xl font-bold text-sky-400 tabular-nums mt-0.5">{fp(userBalance)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center">
                <p className="text-xs text-muted-foreground">{t("platforms") || "Platform"}</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{platforms.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Layout: Sidebar + Content ─────────────────────────────── */}
        <div className="flex gap-5 min-h-[600px]">
          {/* Platform Sidebar */}
          <div className="w-64 shrink-0">
            <div className="sticky top-6 rounded-2xl border border-white/10 bg-gradient-to-b from-card to-card/50 p-3 shadow-xl">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("platforms")}
              </p>
              <div className="space-y-0.5">
                {platforms.map((platform) => {
                  const count = packages.filter((p) => p.platformId === platform.id).length;
                  const isActive = selectedPlatformId === platform.id;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => handlePlatformSelect(platform.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all text-left",
                        isActive
                          ? "bg-sky-500/15 text-sky-300 border border-sky-500/20 font-medium"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      )}
                    >
                      <span className="text-lg w-6 text-center shrink-0">
                        {getPlatformEmoji(platform.name, platform.icon)}
                      </span>
                      <span className="flex-1 truncate">{platform.name}</span>
                      <span className={cn(
                        "ml-auto text-xs rounded-full px-1.5 py-0.5 tabular-nums shrink-0",
                        isActive
                          ? "bg-sky-500/20 text-sky-400"
                          : "bg-white/5 text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Platform Title + Category Tabs + Search */}
            {selectedPlatform && (
              <div className="space-y-3">
                {/* Platform title row */}
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getPlatformEmoji(selectedPlatform.name, selectedPlatform.icon)}</span>
                  <div>
                    <h2 className="text-xl font-bold">{selectedPlatform.name}</h2>
                    <p className="text-xs text-muted-foreground">{t("packagesCount", { count: platformPkgCount }) || `${platformPkgCount} paket`}</p>
                  </div>
                </div>

                {/* Category chips */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-all border",
                      !selectedCategoryId
                        ? "bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-500/20"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
                    )}
                  >
                    {t("all")}
                    <span className="ml-2 text-xs opacity-70">{platformPkgCount}</span>
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-medium transition-all border",
                        selectedCategoryId === cat.id
                          ? "bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-500/20"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
                      )}
                    >
                      {cat.name}
                      <span className="ml-2 text-xs opacity-70">{cat.count}</span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 w-full max-w-sm rounded-xl border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                  />
                </div>
              </div>
            )}

            {/* Package Grid */}
            {filteredPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package size={40} className="text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Bu kategoride paket bulunamadı.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPackages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    userBalance={userBalance}
                    onBuy={handleBuy}
                    fp={fp}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* No platform selected */}
            {!selectedPlatform && platforms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Star size={44} className="text-muted-foreground/20 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">{t("noPackages") || "Henüz hazır paket eklenmemiş."}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        state={modal}
        userBalance={userBalance}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        onRetry={() => {
          if (lastPkg) setModal({ phase: "form", pkg: lastPkg });
        }}
        fp={fp}
        t={t}
      />
    </>
  );
}
