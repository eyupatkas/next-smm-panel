import Link from "next/link";
import { Search, ShoppingBag, TrendingUp, X } from "lucide-react";
import {
  publicListBasePath,
  type PublicServiceCardRow,
  type SortKey,
} from "@/lib/services/service-list-data";
import type { Currency } from "@/lib/currency";
import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb";
import { Pagination } from "./Pagination";
import { ServiceProductCard } from "./ServiceProductCard";
import { ServiceFaq, buildCategoryFaqs } from "./ServiceFaq";
import {
  CatalogSidebar,
  SortBar,
  type SidebarPlatform,
} from "./CatalogSidebar";
import { PlatformVisual, getPlatformPalette } from "./PlatformVisual";

type Props = {
  locale: string;
  // Data
  services: PublicServiceCardRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  perPage: number;
  // Sidebar
  platforms: SidebarPlatform[];
  activePlatformId: string | null;
  activeSubCategoryId: string | null;
  // Sort
  sort: SortKey;
  searchQuery: string;
  // Header content (varies by view)
  headline: {
    title: React.ReactNode;
    description: string;
    eyebrow?: string;
    /** Platform name to drive header visual; null on root view */
    platformName: string | null;
  };
  // Breadcrumb (without the trailing root which is auto-added)
  breadcrumbs: BreadcrumbItem[];
  // SEO content under the grid
  faqTopic: string;
  // Currency
  currency: Currency;
  intlLocale: string;
  unitPriceFor: (s: PublicServiceCardRow) => number;
  // URL builders for pagination & sorting
  buildPageHref: (p: number) => string;
  buildSortHref: (sort: SortKey) => string;
  buildSearchHref: (query: string) => string;
  searchActionHref: string;
};

export function CatalogShoppingPage({
  locale,
  services,
  totalCount,
  page,
  totalPages,
  perPage,
  platforms,
  activePlatformId,
  activeSubCategoryId,
  sort,
  searchQuery,
  headline,
  breadcrumbs,
  faqTopic,
  currency,
  intlLocale,
  unitPriceFor,
  buildPageHref,
  buildSortHref,
  buildSearchHref,
  searchActionHref,
}: Props) {
  const basePath = publicListBasePath(locale);
  const palette = headline.platformName
    ? getPlatformPalette(headline.platformName)
    : null;
  const isRootView = breadcrumbs.length === 0;

  return (
    <div className="container mx-auto px-4">
      <Breadcrumb items={breadcrumbs} />

      {/* Hero header */}
      <header
        className={`service-catalog-hero mb-6 overflow-hidden rounded-3xl border ${palette?.border ?? "border-border"} ${
          palette
            ? `bg-gradient-to-br ${palette.softBg}`
            : "bg-gradient-to-br from-primary/5 via-primary/3 to-blue-500/5"
        } p-5 md:p-7`}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        {headline.platformName ? (
          <div className="hidden md:block">
            <PlatformVisual
              platformName={headline.platformName}
              size="lg"
              className="!h-44"
            />
          </div>
        ) : (
          <div className="hidden items-center justify-center md:flex">
            <div className="grid grid-cols-3 gap-2">
              {["instagram", "tiktok", "youtube", "twitter", "telegram", "spotify"].map(
                (p) => (
                  <div key={p} className="h-14 w-14">
                    <PlatformVisual
                      platformName={p}
                      size="sm"
                      className="!h-14 !w-14"
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col justify-center">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
              <TrendingUp size={12} />
              {totalCount.toLocaleString("tr-TR")} hizmet
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Anlık teslimat
            </span>
            {headline.eyebrow && (
              <span className="text-xs text-muted-foreground">
                {headline.eyebrow}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl lg:text-4xl">
            {headline.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            {headline.description}
          </p>
        </div>
      </header>

      {/* Showcase: only on root view (Servis Listesi anasayfası) */}
      {isRootView && platforms.length > 0 && (
        <PopularPlatformsShowcase
          platforms={platforms}
          basePath={basePath}
        />
      )}

      {/* Main 2-column shopping layout */}
      <div
        className="service-catalog-shell"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "1.25rem",
        }}
      >
        {/* Sidebar */}
        <div
          className="service-catalog-sidebar"
          style={{
            flex: "0 0 min(260px, 100%)",
            maxHeight: "calc(100vh - 7rem)",
            overflowY: "auto",
            paddingRight: "0.25rem",
            position: "sticky",
            top: "6rem",
          }}
        >
          <CatalogSidebar
            locale={locale}
            platforms={platforms}
            activePlatformId={activePlatformId}
            activeSubCategoryId={activeSubCategoryId}
          />
        </div>

        {/* Right column: sort bar + grid + pagination */}
        <div
          className="service-catalog-content"
          style={{ flex: "1 1 640px", minWidth: 0 }}
        >
          <form
            action={searchActionHref}
            className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-sm"
          >
            {sort !== "popular" && (
              <input type="hidden" name="sort" value={sort} />
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <span className="sr-only">Servis ara</span>
                <input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Platform, kategori veya servis ara..."
                  className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Search size={15} />
                Ara
              </button>
              {searchQuery && (
                <Link
                  href={buildSearchHref("")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={15} />
                  Temizle
                </Link>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Instagram, TikTok, takipçi, yorum, kategori veya servis adıyla arama yapabilirsiniz.
            </p>
          </form>

          <SortBar
            totalCount={totalCount}
            page={page}
            perPage={perPage}
            sort={sort}
            buildSortHref={buildSortHref}
          />

          {services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center text-sm text-muted-foreground">
              <ShoppingBag
                size={28}
                className="mx-auto mb-3 opacity-30"
              />
              Bu seçimle eşleşen aktif hizmet bulunamadı.
            </div>
          ) : (
            <section
              aria-label="Hizmetler"
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              {services.map((s) => (
                <ServiceProductCard
                  key={s.id}
                  service={s}
                  basePath={basePath}
                  currency={currency}
                  intlLocale={intlLocale}
                  unitPrice={unitPriceFor(s)}
                />
              ))}
            </section>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={buildPageHref}
          />
        </div>
      </div>

      {/* Trust strip */}
      <section className="mt-12 grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
        {[
          {
            icon: "⚡",
            title: "Anında Teslimat",
            text: "Sipariş sonrası dakikalar içinde başlar.",
          },
          {
            icon: "🛡️",
            title: "Refill Garantisi",
            text: "Düşmelerde tek tıkla telafi.",
          },
          {
            icon: "🔒",
            title: "Güvenli Ödeme",
            text: "Şifreli ve PCI-uyumlu altyapı.",
          },
          {
            icon: "💬",
            title: "7/24 Destek",
            text: "Canlı destekle anında yardım.",
          },
        ].map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-3 rounded-xl bg-muted/30 p-3.5"
          >
            <span className="text-2xl">{b.icon}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {b.title}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {b.text}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* SEO copy + FAQ */}
      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 md:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-foreground">
            {faqTopic} Hakkında
          </h2>
          <div className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>
              {faqTopic} kategorisinde toplam{" "}
              {totalCount.toLocaleString("tr-TR")} aktif hizmet bulunmaktadır.
              Her hizmet ürün gibi sergilenir; bir bakışta minimum-maksimum
              sipariş limitleri, birim fiyatı, refill ve iptal gibi
              özellikleri görebilirsiniz.
            </p>
            <p>
              Sipariş için yalnızca herkese açık bağlantınızı ve istediğiniz
              miktarı girmeniz yeterli. Hesap güvenliğiniz gözetilir; hiçbir
              koşulda parola ya da doğrulama kodu istenmez. Tüm işlemler
              güvenli altyapımız üzerinden gerçekleştirilir.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="mb-2 text-base font-bold text-foreground">
            Toplu Sipariş
          </p>
          <p className="mb-4 text-xs leading-6 text-muted-foreground">
            Yüzlerce link için panele giriş yaparak toplu sipariş aracını
            kullanabilirsiniz.
          </p>
          <Link
            href="/dashboard/new-order"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <ShoppingBag size={14} />
            Panele Git
          </Link>
        </div>
      </section>

      <div className="mt-8">
        <ServiceFaq faqs={buildCategoryFaqs(faqTopic, totalCount)} />
      </div>
    </div>
  );
}

/**
 * Anasayfa (root) görünümü için popüler platform vitrini.
 * En çok hizmet barındıran 8 platform kartını ItemList JSON-LD'siyle birlikte
 * render eder. SEO + UX iyileştirmesi.
 */
function PopularPlatformsShowcase({
  platforms,
  basePath,
}: {
  platforms: SidebarPlatform[];
  basePath: string;
}) {
  const top = [...platforms]
    .filter((p) => p.slug)
    .sort((a, b) => b.totalServices - a.totalServices)
    .slice(0, 8);

  if (top.length === 0) return null;

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Popüler SMM Hizmet Platformları",
    itemListElement: top.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${basePath}/${p.slug}`,
      name: p.name,
    })),
  };

  return (
    <section
      aria-label="Popüler platformlar"
      className="mb-8 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vitrin
          </p>
          <h2 className="text-lg font-bold text-foreground md:text-xl">
            Popüler SMM Platformları
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Doğrudan ilgilendiğin platforma git, hizmetleri keşfet.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {top.map((p) => {
          const palette = getPlatformPalette(p.name);
          return (
            <li key={p.id}>
              <Link
                href={`${basePath}/${p.slug}`}
                className={`group flex items-center gap-3 rounded-2xl border bg-background p-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${palette.border}`}
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                  <PlatformVisual platformName={p.name} size="sm" className="!h-12 !w-12" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.totalServices.toLocaleString("tr-TR")} hizmet
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
    </section>
  );
}
