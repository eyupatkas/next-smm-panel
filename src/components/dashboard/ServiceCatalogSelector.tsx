"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FavoriteToggleButton } from "@/components/shared/FavoriteToggleButton";
import { getPlatformColor, getPlatformIcon } from "@/lib/platform-icons";
import { unitPriceSuffix } from "@/lib/client-pricing";
import {
  Bell,
  ChevronRight,
  Clapperboard,
  Eye,
  FolderTree,
  Globe,
  Hash,
  Heart,
  Layers,
  MessageCircle,
  Package,
  Radio,
  Search,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";

export type CatalogServiceItem = {
  id: string;
  name: string;
  description?: string | null;
  min: number;
  max: number;
  unitPrice: number;
  pricingMode?: "PER_THOUSAND" | "PER_UNIT";
  categoryId: string;
  categoryName: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  canRefill?: boolean;
  canCancel?: boolean;
  hasDripfeed?: boolean;
  providerCode?: string | null;
  avgCompletionMinutes?: number | null;
  serviceType?: string | null;
  linkFormat?: string | null;
};

function formatSpeed(minutes: number): string {
  if (minutes < 60) return `~${Math.round(minutes)} dk`;
  if (minutes < 1440) return `~${Math.round(minutes / 60)} saat`;
  return "24+ saat";
}

const PROVIDER_CODE_COLORS: Record<string, string> = {
  S1: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  S2: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  S3: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  S4: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};
function getProviderBadgeClass(code: string): string {
  return PROVIDER_CODE_COLORS[code] ?? "bg-white/10 text-muted-foreground border-white/10";
}

function getCategoryIcon(name: string) {
  const n = name.toLocaleLowerCase("tr");
  if (n.includes("takipçi") || n.includes("abone") || n.includes("üye") || n.includes("follower") || n.includes("subscribe")) return <UserPlus size={15} />;
  if (n.includes("beğeni") || n.includes("like") || n.includes("heart")) return <Heart size={15} />;
  if (n.includes("yorum") || n.includes("comment")) return <MessageCircle size={15} />;
  if (n.includes("izlenme") || n.includes("view") || n.includes("play") || n.includes("listen")) return <Eye size={15} />;
  if (n.includes("paylaşım") || n.includes("share") || n.includes("repost") || n.includes("retweet")) return <Share2 size={15} />;
  if (n.includes("canlı") || n.includes("live") || n.includes("stream")) return <Radio size={15} />;
  if (n.includes("otomatik") || n.includes("auto")) return <Zap size={15} />;
  if (n.includes("hedefli") || n.includes("targeted") || n.includes("country")) return <Target size={15} />;
  if (n.includes("hikaye") || n.includes("story")) return <Clapperboard size={15} />;
  if (n.includes("paket") || n.includes("bundle")) return <Package size={15} />;
  if (n.includes("trafik") || n.includes("traffic")) return <TrendingUp size={15} />;
  if (n.includes("bildirim") || n.includes("notify") || n.includes("push")) return <Bell size={15} />;
  if (n.includes("reels") || n.includes("shorts") || n.includes("video")) return <Layers size={15} />;
  return <Sparkles size={15} />;
}

type Props = {
  services: CatalogServiceItem[];
  selectedServiceId: string | null;
  onSelectService: (service: CatalogServiceItem) => void;
  formatPrice: (amount: number) => string;
  platformLabel?: string;
  searchPlaceholder?: string;
  selectPlatformHint?: string;
  selectCategoryHint?: string;
  pageSize?: number;
  loadingMoreLabel?: string;
  noResultsLabel?: string;
  showAllLabel?: string;
  showLessLabel?: string;
  serviceCountLabel?: (count: number) => string;
};

type CatalogCategory = {
  id: string;
  name: string;
  services: CatalogServiceItem[];
};

type CatalogPlatform = {
  id: string;
  name: string;
  categories: CatalogCategory[];
  serviceCount: number;
};

function InfiniteServiceList({
  services,
  selectedServiceId,
  onSelectService,
  formatPrice,
  pageSize,
  loadingMoreLabel = "Yükleniyor...",
}: {
  services: CatalogServiceItem[];
  selectedServiceId: string | null;
  onSelectService: (service: CatalogServiceItem) => void;
  formatPrice: (amount: number) => string;
  pageSize: number;
  loadingMoreLabel?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const visibleServices = useMemo(() => services.slice(0, visibleCount), [services, visibleCount]);

  useEffect(() => {
    if (!services.length || visibleCount >= services.length || !loadMoreRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + pageSize, services.length));
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [pageSize, services.length, visibleCount]);

  return (
    <Card className="border-white/10">
      <CardContent className="max-h-[460px] overflow-y-auto p-0">
        {visibleServices.map((service) => (
          <div
            key={service.id}
            className={cn(
              "flex w-full items-center gap-2 border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/5",
              service.id === selectedServiceId && "bg-primary/10 border-primary/20"
            )}
          >
            <button
              type="button"
              onClick={() => onSelectService(service)}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
            >
              <span className="text-muted-foreground shrink-0">
                {getPlatformIcon(service.parentCategoryName || service.categoryName, "sm")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {service.providerCode && (
                    <span className={cn("shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono font-bold leading-none border", getProviderBadgeClass(service.providerCode))}>
                      {service.providerCode}
                    </span>
                  )}
                  <p className="truncate text-sm font-medium">{service.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Min: {service.min.toLocaleString()} · Max: {service.max.toLocaleString()}
                  {service.avgCompletionMinutes != null && (
                    <> · <span className="text-emerald-400">⚡ Gönderim: {formatSpeed(service.avgCompletionMinutes)}</span></>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">{formatPrice(service.unitPrice)}</p>
                <p className="text-xs text-muted-foreground">{unitPriceSuffix(service.pricingMode)}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </button>
            <FavoriteToggleButton
              serviceId={service.id}
              stopPropagation
              className="mr-3 h-8 w-8 shrink-0 rounded-lg border-white/10 bg-white/5"
            />
          </div>
        ))}

        {services.length > visibleServices.length && (
          <div ref={loadMoreRef} className="px-4 py-4 text-center text-xs text-muted-foreground">
            {loadingMoreLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Popüler platformlar önce gösterilir, geri kalanlar alfabetik
const PLATFORM_PRIORITY: Record<string, number> = {
  "instagram": 1,
  "tiktok": 2,
  "youtube": 3,
  "facebook": 4,
  "twitter / x": 5,
  "twitter": 5,
  "telegram": 6,
  "whatsapp": 7,
  "snapchat": 8,
  "discord": 9,
  "spotify": 10,
  "linkedin": 11,
  "pinterest": 12,
  "reddit": 13,
  "twitch": 14,
  "soundcloud": 15,
  "threads": 16,
  "website traffic": 17,
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

export function ServiceCatalogSelector({
  services,
  selectedServiceId,
  onSelectService,
  formatPrice,
  platformLabel = "Sosyal Platform Seçin",
  searchPlaceholder = "Servis ara...",
  selectPlatformHint = "Önce bir platform seçin.",
  selectCategoryHint = "Devam etmek için bir kategori seçin.",
  pageSize = 24,
  loadingMoreLabel = "Daha fazla servis yükleniyor...",
  noResultsLabel = "Sonuç bulunamadı.",
  showAllLabel = "Tüm Platformlar",
  showLessLabel = "Daha Az",
  serviceCountLabel = (count) => `${count} servis`,
}: Props) {
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const categoryRef = useRef<HTMLDivElement>(null);

  const platforms = useMemo<CatalogPlatform[]>(() => {
    const platformMap = new Map<
      string,
      { name: string; categories: Map<string, CatalogCategory> }
    >();

    for (const service of services) {
      // Gruplama anahtarı olarak isim kullan — farklı sağlayıcıların aynı isimli platformları birleşir
      const platformKey = catalogKey(service.parentCategoryName || service.categoryName);
      const platformName = service.parentCategoryName || service.categoryName;

      if (!platformMap.has(platformKey)) {
        platformMap.set(platformKey, { name: platformName, categories: new Map() });
      }

      const platform = platformMap.get(platformKey)!;
      // Alt kategori gruplama da isme göre — aynı isimli alt kategoriler birleşir
      const categoryKey = catalogKey(service.categoryName);
      const categoryName = service.categoryName;

      if (!platform.categories.has(categoryKey)) {
        platform.categories.set(categoryKey, { id: categoryKey, name: categoryName, services: [] });
      }

      platform.categories.get(categoryKey)!.services.push(service);
    }

    return Array.from(platformMap.entries())
      .map(([id, platform]) => {
        const categories = Array.from(platform.categories.values()).map((category) => ({
          ...category,
          services: [...category.services].sort((a, b) => a.unitPrice - b.unitPrice),
        }));

        return {
          id,
          name: platform.name,
          categories,
          serviceCount: categories.reduce((total, category) => total + category.services.length, 0),
        };
      })
      .sort((a, b) => {
        const aPri = PLATFORM_PRIORITY[a.name.toLowerCase()] ?? 999;
        const bPri = PLATFORM_PRIORITY[b.name.toLowerCase()] ?? 999;
        if (aPri !== bPri) return aPri - bPri;
        return a.name.localeCompare(b.name, "tr");
      });
  }, [services]);

  const currentPlatform = useMemo(
    () => platforms.find((platform) => platform.id === selectedPlatformId) || null,
    [platforms, selectedPlatformId]
  );

  const currentCategory = useMemo(
    () => currentPlatform?.categories.find((category) => category.id === selectedCategoryId) || null,
    [currentPlatform, selectedCategoryId]
  );

  const searchedServices = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return services
      .filter(
        (service) =>
          service.name.toLowerCase().includes(normalizedQuery) ||
          service.categoryName.toLowerCase().includes(normalizedQuery) ||
          (service.parentCategoryName || "").toLowerCase().includes(normalizedQuery)
      )
      .sort((a, b) => a.unitPrice - b.unitPrice)
      .slice(0, 40);
  }, [deferredSearchQuery, services]);

  const currentServices = useMemo(() => {
    if (!currentCategory) return [];
    return currentCategory.services;
  }, [currentCategory]);

  const visiblePlatforms = showAllPlatforms ? platforms : platforms.slice(0, 16);

  return (
    <div className="space-y-4">
      <Card className="border-white/10">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {platformLabel}
            </h2>
          </div>

          <div className={cn(
            "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6",
            showAllPlatforms && "max-h-[310px] overflow-y-auto overflow-x-hidden pr-1"
          )}>
            {visiblePlatforms.map((platform) => {
              const isActive = platform.id === selectedPlatformId;

              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      setSelectedPlatformId(null);
                      setSelectedCategoryId(null);
                      return;
                    }

                    setSelectedPlatformId(platform.id);
                    setSelectedCategoryId(platform.categories.length === 1 ? platform.categories[0].id : null);
                    // Auto-scroll to category section
                    setTimeout(() => {
                      categoryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }, 80);
                  }}
                  className={cn(
                    "relative rounded-xl border px-3 py-3 text-left transition-all hover:scale-[1.01]",
                    isActive
                      ? `bg-gradient-to-br ${getPlatformColor(platform.name)} shadow-lg`
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? "" : "text-muted-foreground"}>
                      {getPlatformIcon(platform.name, "md")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{platform.name}</p>
                      <p className="text-xs opacity-70">{serviceCountLabel(platform.serviceCount)}</p>
                    </div>
                  </div>
                </button>
              );
            })}

            {platforms.length > 16 && (
              <button
                type="button"
                onClick={() => setShowAllPlatforms((value) => !value)}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-3 hover:bg-white/10 transition-all"
              >
                <Hash size={20} className="text-muted-foreground" />
                <span className="text-sm font-medium">
                  {showAllPlatforms ? showLessLabel : showAllLabel}
                </span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-11 w-full rounded-lg border border-white/10 bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {deferredSearchQuery.trim() ? (
        <Card className="border-white/10">
          <CardContent className="p-0">
            {searchedServices.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {noResultsLabel}
              </div>
            )}
            {searchedServices.map((service) => (
              <div
                key={service.id}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/5",
                  service.id === selectedServiceId && "bg-primary/10"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectService(service)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="text-muted-foreground shrink-0">
                    {getPlatformIcon(service.parentCategoryName || service.categoryName, "sm")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {service.providerCode && (
                        <span className={cn("shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono font-bold leading-none border", getProviderBadgeClass(service.providerCode))}>
                          {service.providerCode}
                        </span>
                      )}
                      <p className="truncate text-sm font-medium">{service.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {service.parentCategoryName || service.categoryName} · {service.categoryName}
                      {service.avgCompletionMinutes != null && (
                        <> · <span className="text-emerald-400">⚡ Gönderim: {formatSpeed(service.avgCompletionMinutes)}</span></>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{formatPrice(service.unitPrice)}</p>
                    <p className="text-xs text-muted-foreground">{unitPriceSuffix(service.pricingMode)}</p>
                  </div>
                </button>
                <FavoriteToggleButton
                  serviceId={service.id}
                  stopPropagation
                  className="mr-3 h-8 w-8 shrink-0 rounded-lg border-white/10 bg-white/5"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          {!currentPlatform && (
            <Card className="border-white/10">
              <CardContent className="py-12 text-center">
                <Globe size={40} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">{selectPlatformHint}</p>
              </CardContent>
            </Card>
          )}

          {currentPlatform && (
            <div ref={categoryRef} className="scroll-mt-2">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                Kategori Seçin
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {currentPlatform.categories.map((category) => {
                  const isActiveCategory = category.id === selectedCategoryId;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all hover:scale-[1.01]",
                        isActiveCategory
                          ? "border-primary/40 bg-primary/15 shadow-sm shadow-primary/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                      )}
                    >
                      <span className={cn(
                        "shrink-0 flex h-7 w-7 items-center justify-center rounded-lg",
                        isActiveCategory ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground group-hover:text-foreground"
                      )}>
                        {getCategoryIcon(category.name)}
                      </span>
                      <div className="min-w-0">
                        <p className={cn(
                          "truncate text-sm font-medium leading-none",
                          isActiveCategory ? "text-primary" : "text-foreground/80"
                        )}>
                          {category.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground/70">
                          {serviceCountLabel(category.services.length)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentPlatform && !currentCategory && (
            <Card className="border-white/10">
              <CardContent className="py-10 text-center">
                <FolderTree size={36} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">{selectCategoryHint}</p>
              </CardContent>
            </Card>
          )}

          {currentCategory && (
            <InfiniteServiceList
              key={`${currentCategory.id}:${deferredSearchQuery}:${pageSize}`}
              services={currentServices}
              selectedServiceId={selectedServiceId}
              onSelectService={onSelectService}
              formatPrice={formatPrice}
              pageSize={pageSize}
              loadingMoreLabel={loadingMoreLabel}
            />
          )}
        </>
      )}
    </div>
  );
}