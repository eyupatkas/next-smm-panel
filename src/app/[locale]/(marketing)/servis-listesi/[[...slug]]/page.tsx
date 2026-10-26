import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import {
  localeToIntlCode,
} from "@/lib/currency";
import { getLiveCurrencyRates } from "@/lib/exchange-rates";
import { getRequestCurrency } from "@/lib/request-currency";
import {
  PUBLIC_SERVICES_PER_PAGE,
  buildCategoryUrl,
  buildServiceUrl,
  findPublicCategoryBySegment,
  findPublicServiceBySegment,
  listAllPublicServices,
  listChildCategories,
  listPublicServicesInCategory,
  listRelatedServices,
  listRootCategories,
  pricingModeFor,
  publicListBasePath,
  type PublicServiceCardRow,
  type SortKey,
  unitPriceFor,
} from "@/lib/services/service-list-data";
import { publicCategorySegment } from "@/lib/public-service-slugs";
import { CatalogShoppingPage } from "@/components/marketing/servis-listesi/CatalogShoppingPage";
import { ServiceDetailView } from "@/components/marketing/servis-listesi/ServiceDetailView";
import { getReservedDashboardBalance } from "@/lib/services/dashboard-checkout";
import {
  BreadcrumbJsonLd,
  ItemListJsonLd,
  ProductJsonLd,
} from "@/components/marketing/servis-listesi/JsonLd";
import { getServiceReviewStats, getServiceReviews } from "@/lib/reviews";
import type { SidebarPlatform } from "@/components/marketing/servis-listesi/CatalogSidebar";

// ISR: katalog 3 dakikada bir yeniden üret (CWV + crawl bütçesi için)
export const revalidate = 180;

type Params = Promise<{ slug?: string[]; locale: string }>;
type SearchParams = Promise<{
  page?: string;
  sort?: string;
  q?: string;
}>;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

const VALID_SORTS: SortKey[] = ["popular", "cheap", "expensive", "name"];
function parseSort(value: string | undefined): SortKey {
  return VALID_SORTS.includes(value as SortKey)
    ? (value as SortKey)
    : "popular";
}

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug = [], locale } = await params;
  const path = slug.length > 0 ? `/servis-listesi/${slug.join("/")}` : "/servis-listesi";

  if (slug.length >= 3) {
    const service = await findPublicServiceBySegment(slug[slug.length - 1]);
    if (!service) return { title: "Servis Listesi | OptiSMM" };
    const desc =
      service.description?.slice(0, 155) ||
      `${service.name} — minimum ${service.min.toLocaleString("tr-TR")}, maksimum ${service.max.toLocaleString("tr-TR")} adet sipariş. Anında teslimat, güvenli ödeme, 7/24 destek. Detayları, fiyatı ve özellikleri inceleyin.`;
    return {
      title: `${service.name} Satın Al — Fiyat ve Detayları | OptiSMM`,
      description: desc,
      alternates: {
        canonical: canonicalUrl(locale, path),
        languages: hreflangAlternates(path),
      },
      openGraph: {
        title: `${service.name} | OptiSMM`,
        description: desc,
        type: "website",
      },
    };
  }

  if (slug.length >= 1) {
    const category = await findPublicCategoryBySegment(slug[slug.length - 1]);
    if (!category) return { title: "Servis Listesi | OptiSMM" };
    const desc =
      category.description?.slice(0, 155) ||
      `${category.name} hizmetlerini ürün gibi sergiledik. Tüm fiyatlar, sipariş limitleri ve özellikler tek vitrinde — favori hizmeti seç ve dakikalar içinde sahip ol.`;
    return {
      title: `${category.name} Hizmetleri Mağazası | OptiSMM`,
      description: desc,
      alternates: {
        canonical: canonicalUrl(locale, path),
        languages: hreflangAlternates(path),
      },
      openGraph: {
        title: `${category.name} Hizmetleri | OptiSMM`,
        description: desc,
        type: "website",
      },
    };
  }

  return {
    title: "Sosyal Medya Hizmet Mağazası ve Fiyat Listesi | OptiSMM",
    description:
      "Instagram, TikTok, YouTube ve daha fazlası için tüm sosyal medya hizmetlerini ürün gibi sergiledik. Kart kart hizmet seç, sepete ekle, dakikalar içinde teslim al.",
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
    openGraph: {
      title: "Sosyal Medya Hizmet Mağazası | OptiSMM",
      description:
        "2000+ aktif sosyal medya hizmeti, e-ticaret tarzında ürün vitrininde. Anında teslimat ve 7/24 destek.",
      type: "website",
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function buildSidebarPlatforms(
  activePlatformId: string | null,
): Promise<SidebarPlatform[]> {
  const roots = await listRootCategories();

  // For the active platform, fetch the full child list (rather than top 6)
  let activeChildren: Awaited<ReturnType<typeof listChildCategories>> = [];
  if (activePlatformId) {
    activeChildren = await listChildCategories(activePlatformId);
  }

  return roots.map((r) => {
    const childRows =
      r.id === activePlatformId && activeChildren.length > 0
        ? activeChildren
        : r.children;

    const childCounts = childRows.reduce(
      (sum, c) => sum + (c._count?.services ?? 0),
      0,
    );

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      totalServices: (r._count?.services ?? 0) + childCounts,
      children: childRows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count?.services ?? 0,
      })),
    };
  });
}

function normalizeQuery(value: string | undefined) {
  return value?.trim() ?? "";
}

function buildListHref(
  basePath: string,
  pathSegments: string[],
  page: number,
  sort: SortKey,
  query = "",
) {
  const path =
    pathSegments.length > 0
      ? `${basePath}/${pathSegments.join("/")}`
      : basePath;
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (sort !== "popular") params.set("sort", sort);
  if (query) params.set("q", query);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function buildPathHref(basePath: string, pathSegments: string[]) {
  return pathSegments.length > 0
    ? `${basePath}/${pathSegments.join("/")}`
    : basePath;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function PublicServiceListPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug = [], locale } = await params;
  const { page: pageStr = "1", sort: sortStr, q: qStr } = await searchParams;
  const sort = parseSort(sortStr);
  const query = normalizeQuery(qStr);

  const basePath = publicListBasePath(locale);
  const liveRates = await getLiveCurrencyRates();
  const currency = await getRequestCurrency(locale, liveRates);
  const intlLocale =
    localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? "tr-TR";

  // Auth: gracefully handle stale/invalid JWTs (e.g. after secret rotation)
  // by treating the visitor as anonymous instead of crashing the page.
  const session = await auth().catch(() => null);
  const role = session?.user?.role ?? "USER";
  const isLoggedIn = Boolean(session?.user?.id);
  const userId = session?.user?.id ?? null;

  // ── Service detail ─────────────────────────────────────────────────────
  if (slug.length >= 3) {
    const service = await findPublicServiceBySegment(slug[slug.length - 1]);
    if (!service) notFound();

    const availableBalance = userId
      ? await (async () => {
          const [user, reservedBalance] = await Promise.all([
            db.user.findUnique({
              where: { id: userId },
              select: { balance: true },
            }),
            getReservedDashboardBalance(db, userId),
          ]);

          return Number(
            Math.max(Number(user?.balance ?? 0) - reservedBalance, 0).toFixed(4),
          );
        })()
      : 0;

    const unit = unitPriceFor(role, service);
    const platform =
      service.category.parent?.name ?? service.category.name;
    const related = await listRelatedServices(
      service.category.id,
      service.id,
    );

    // Reviews + completed order count for SEO
    const [reviewStats, reviewRows, soldData] = await Promise.all([
      getServiceReviewStats(service.id),
      getServiceReviews(service.id, { take: 20 }),
      db.service.findUnique({
        where: { id: service.id },
        select: { completedOrderCount: true },
      }),
    ]);
    const totalSold = soldData?.completedOrderCount ?? 0;
    const reviews = reviewRows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));

    const url = `${SITE_URL}/servis-listesi/${slug.join("/")}`;
    const breadcrumbItems = [
      { name: "Servis Listesi", href: basePath },
      ...(service.category.parent
        ? [
            {
              name: service.category.parent.name,
              href: `${basePath}/${publicCategorySegment(service.category.parent)}`,
            },
            {
              name: service.category.name,
              href: `${basePath}/${publicCategorySegment(service.category.parent)}/${publicCategorySegment(service.category)}`,
            },
          ]
        : [
            {
              name: service.category.name,
              href: `${basePath}/${publicCategorySegment(service.category)}`,
            },
          ]),
      { name: service.name, href: url },
    ];

    return (
      <div className="min-h-screen bg-background pb-20 pt-28">
        <ServiceDetailView
          locale={locale}
          service={service}
          unitPrice={unit}
          pricingMode={pricingModeFor(service)}
          isLoggedIn={isLoggedIn}
          userBalance={availableBalance}
          currency={currency}
          intlLocale={intlLocale}
          related={related}
          unitPriceForRelated={(s: PublicServiceCardRow) =>
            unitPriceFor(role, s)
          }
          reviewStats={reviewStats}
          reviews={reviews}
          totalSold={totalSold}
        />
        <BreadcrumbJsonLd siteUrl={SITE_URL} items={breadcrumbItems} />
        <ProductJsonLd
          siteUrl={SITE_URL}
          url={url}
          name={service.name}
          description={
            service.description ??
            `${service.name} — ${platform} için minimum ${service.min} maksimum ${service.max} adet sipariş.`
          }
          category={service.category.name}
          brand={platform}
          price={unit * currency.rateFromTRY}
          currency={currency.code}
          min={service.min}
          max={service.max}
          aggregateRating={
            reviewStats.count > 0
              ? {
                  ratingValue: reviewStats.average,
                  reviewCount: reviewStats.count,
                }
              : null
          }
          reviews={reviews.slice(0, 5).map((r) => ({
            author: r.authorName,
            rating: r.rating,
            title: r.title,
            body: r.comment,
            datePublished: r.createdAt,
          }))}
        />
      </div>
    );
  }

  // ── Category view (1 or 2 segments) ────────────────────────────────────
  if (slug.length >= 1) {
    const category = await findPublicCategoryBySegment(slug[slug.length - 1]);
    if (!category) notFound();

    const page = Math.max(1, Number(pageStr) || 1);
    const activePlatformId = category.parent?.id ?? category.id;
    const activeSubCategoryId = category.parent ? category.id : null;

    const [{ totalCount, rows }, platforms] = await Promise.all([
      listPublicServicesInCategory(
        category.id,
        page,
        PUBLIC_SERVICES_PER_PAGE,
        sort,
        query,
      ),
      buildSidebarPlatforms(activePlatformId),
    ]);

    const totalPages = Math.ceil(totalCount / PUBLIC_SERVICES_PER_PAGE);

    const breadcrumbItems = [
      { name: "Servis Listesi", href: basePath },
      ...(category.parent
        ? [
            {
              name: category.parent.name,
              href: `${basePath}/${publicCategorySegment(category.parent)}`,
            },
          ]
        : []),
      {
        name: category.name,
        href: buildCategoryUrl(basePath, category),
      },
    ];

    const itemListItems = rows.map((s) => ({
      name: s.name,
      url: buildServiceUrl(basePath, s),
    }));

    const platformName =
      category.parent?.name ?? category.name;

    const headlineTitle = category.parent
      ? `${category.parent.name} ${category.name}`
      : `${category.name} Hizmetleri`;

    return (
      <div className="min-h-screen bg-background pb-20 pt-28">
        <CatalogShoppingPage
          locale={locale}
          services={rows}
          totalCount={totalCount}
          page={page}
          totalPages={totalPages}
          perPage={PUBLIC_SERVICES_PER_PAGE}
          platforms={platforms}
          activePlatformId={activePlatformId}
          activeSubCategoryId={activeSubCategoryId}
          sort={sort}
          searchQuery={query}
          headline={{
            title: headlineTitle,
            description:
              category.description ||
              `${headlineTitle} kategorisinde ${totalCount.toLocaleString("tr-TR")} aktif hizmet. Tüm fiyatlar, sipariş limitleri ve özellikler bir vitrinde — favori hizmetinizi seçin ve dakikalar içinde teslim alın.`,
            eyebrow: category.parent
              ? `${category.parent.name} kategorisi`
              : "Mağaza",
            platformName,
          }}
          breadcrumbs={breadcrumbItems.map((b) => ({
            label: b.name,
            href: b.href,
          }))}
          faqTopic={headlineTitle}
          currency={currency}
          intlLocale={intlLocale}
          unitPriceFor={(s) => unitPriceFor(role, s)}
          buildPageHref={(p) => buildListHref(basePath, slug, p, sort, query)}
          buildSortHref={(s) => buildListHref(basePath, slug, 1, s, query)}
          buildSearchHref={(q) => buildListHref(basePath, slug, 1, sort, q.trim())}
          searchActionHref={buildPathHref(basePath, slug)}
        />
        <BreadcrumbJsonLd siteUrl={SITE_URL} items={breadcrumbItems} />
        <ItemListJsonLd siteUrl={SITE_URL} items={itemListItems} />
      </div>
    );
  }

  // ── Root view ──────────────────────────────────────────────────────────
  const page = Math.max(1, Number(pageStr) || 1);
  const [{ totalCount, rows }, platforms] = await Promise.all([
    listAllPublicServices(page, PUBLIC_SERVICES_PER_PAGE, sort, query),
    buildSidebarPlatforms(null),
  ]);

  const totalPages = Math.ceil(totalCount / PUBLIC_SERVICES_PER_PAGE);

  return (
    <div className="min-h-screen bg-background pb-20 pt-28">
      <CatalogShoppingPage
        locale={locale}
        services={rows}
        totalCount={totalCount}
        page={page}
        totalPages={totalPages}
        perPage={PUBLIC_SERVICES_PER_PAGE}
        platforms={platforms}
        activePlatformId={null}
        activeSubCategoryId={null}
        sort={sort}
        searchQuery={query}
        headline={{
          title: "Sosyal Medya Hizmet Mağazası",
          description: `Instagram, TikTok, YouTube ve daha fazlası için ${totalCount.toLocaleString("tr-TR")} aktif sosyal medya hizmetini ürün vitrininde sergiledik. Sol menüden platformu, üstten sıralamayı seçin; favori hizmetinizi dakikalar içinde teslim alın.`,
          eyebrow: "Mağaza",
          platformName: null,
        }}
        breadcrumbs={[{ label: "Servis Listesi" }]}
        faqTopic="Sosyal Medya Hizmetleri"
        currency={currency}
        intlLocale={intlLocale}
        unitPriceFor={(s) => unitPriceFor(role, s)}
        buildPageHref={(p) => buildListHref(basePath, [], p, sort, query)}
        buildSortHref={(s) => buildListHref(basePath, [], 1, s, query)}
        buildSearchHref={(q) => buildListHref(basePath, [], 1, sort, q.trim())}
        searchActionHref={buildPathHref(basePath, [])}
      />
      <BreadcrumbJsonLd
        siteUrl={SITE_URL}
        items={[{ name: "Servis Listesi", href: basePath }]}
      />
      <ItemListJsonLd
        siteUrl={SITE_URL}
        items={platforms.map((p) => ({
          name: p.name,
          url: `${basePath}/${p.slug ?? p.id}`,
        }))}
      />
    </div>
  );
}
