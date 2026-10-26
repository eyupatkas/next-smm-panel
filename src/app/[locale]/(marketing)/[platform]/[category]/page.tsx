import { db } from "@/lib/db";
import { PackageShowcase } from "@/components/marketing/PackageShowcase";
import { getTranslatedName, getTranslatedDescription } from "@/lib/i18n-db";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { ChevronRight, Sparkles, Shield, Zap, Clock, Headphones } from "lucide-react";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import { calculateProviderCost } from "@/lib/pricing";
import { applyPricingGuard, getPricingGuard } from "@/lib/pricing-guard";
import { extractSpeedLabel } from "@/lib/service-info";

// ISR: 5 dakika cache, prerendering destekli
export const revalidate = 300;

type TJson = Record<string, { name?: string; description?: string }> | null;

/* ─── Metadata ─────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string; category: string; locale: string }>;
}): Promise<Metadata> {
  const { platform: platformSlug, category: categorySlug, locale } = await params;
  const t = await getTranslations("categoryPage");

  const cat = await db.category.findFirst({
    where: {
      slug: categorySlug,
      status: true,
      parent: { slug: platformSlug, parentId: null },
    },
    select: {
      name: true,
      parent: { select: { name: true } },
    },
  });

  if (!cat) return {};

  const catName = cat.name;
  const platformName = cat.parent?.name ?? "";
  const path = `/${platformSlug}/${categorySlug}`;

  return {
    title: t("metaTitle", { category: catName, platform: platformName }),
    description: t("metaDesc", { category: catName, platform: platformName }),
    keywords: `${platformName} ${catName} satın al, ${platformName} ${catName}, ${catName} satın al, ${platformName} ${catName} fiyatları, ucuz ${platformName} ${catName}, güvenilir ${platformName} ${catName}`,
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
    openGraph: {
      title: t("metaOgTitle", { category: catName, platform: platformName }),
      description: t("metaDesc", { category: catName, platform: platformName }),
      url: canonicalUrl(locale, path),
      type: "website",
      locale: "tr_TR",
      alternateLocale: ["en_US", "de_DE", "ar_SA", "zh_CN", "fr_FR", "es_ES"],
      siteName: "OptiSMM",
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaOgTitle", { category: catName, platform: platformName }),
      description: t("metaDesc", { category: catName, platform: platformName }),
    },
  };
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ platform: string; category: string }>;
}) {
  const { platform: platformSlug, category: categorySlug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("categoryPage");

  // Fetch platform (parent category)
  const platform = await db.category.findFirst({
    where: { slug: platformSlug, parentId: null, status: true },
    select: { id: true, name: true, translations: true },
  });
  if (!platform) notFound();

  // Fetch sub-category with packages
  const subcat = await db.category.findFirst({
    where: {
      slug: categorySlug,
      parentId: platform.id,
      status: true,
    },
    select: {
      id: true,
      name: true,
      translations: true,
      packages: {
        where: { status: true },
        select: {
          id: true,
          serviceId: true,
          name: true,
          quantity: true,
          price: true,
          retailPrice: true,
          description: true,
          comboItems: true,
          translations: true,
          service: {
            select: {
              serviceType: true,
              price: true,
              name: true,
              canRefill: true,
              canCancel: true,
              min: true,
              max: true,
              avgCompletionMinutes: true,
              completedOrderCount: true,
              ratingAvg: true,
              ratingCount: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
      },
    },
  });
  if (!subcat) notFound();

  const platformName = getTranslatedName(platform.name, platform.translations as TJson, locale);
  const categoryName = getTranslatedName(subcat.name, subcat.translations as TJson, locale);

  type ComboItem = { serviceId: string; quantity: number; label: string };

  const guard = await getPricingGuard();
  const packages = subcat.packages.map((pkg) => {
    const listed = Number(pkg.retailPrice ?? pkg.price);
    const providerCost = pkg.service
      ? calculateProviderCost(
          { price: pkg.service.price, retailPrice: null, resellerPrice: null, serviceType: pkg.service.serviceType, min: pkg.service.min, max: pkg.service.max },
          pkg.quantity
        )
      : 0;
    return {
      id: pkg.id,
      serviceId: pkg.serviceId,
      name: getTranslatedName(pkg.name, pkg.translations as TJson, locale),
      quantity: pkg.quantity,
      price: Number(pkg.price),
      retailPrice: applyPricingGuard(listed, providerCost, guard),
      description: getTranslatedDescription(pkg.description, pkg.translations as TJson, locale),
      comboItems: Array.isArray(pkg.comboItems) ? (pkg.comboItems as ComboItem[]) : null,
      platformName,
      categoryName,
      serviceType: pkg.service?.serviceType ?? "Default",
      guarantee: pkg.service?.canRefill ?? null,
      canCancel: pkg.service?.canCancel ?? null,
      speedLabel: pkg.service ? extractSpeedLabel(pkg.service.name) : null,
      orderCount: pkg.service?.completedOrderCount ?? 0,
      ratingAvg: pkg.service?.ratingAvg ?? null,
      ratingCount: pkg.service?.ratingCount ?? 0,
    };
  });

  const trustItems = [
    { icon: Shield, label: t("trustSecure") },
    { icon: Zap, label: t("trustFast") },
    { icon: Clock, label: t("trustGuarantee") },
    { icon: Headphones, label: t("trustSupport") },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Tüm Platformlar", item: `${siteUrl}/services` },
      { "@type": "ListItem", position: 3, name: platformName, item: `${siteUrl}/${platformSlug}` },
      { "@type": "ListItem", position: 4, name: categoryName, item: `${siteUrl}/${platformSlug}/${categorySlug}` },
    ],
  };

  const itemListSchema = packages.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${platformName} ${categoryName} Paketleri`,
    description: `${platformName} ${categoryName} satın al. En uygun fiyatlı paketler.`,
    numberOfItems: packages.length,
    itemListElement: packages.map((pkg, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: pkg.name,
        description: pkg.description || `${pkg.quantity} adet ${platformName} ${categoryName}`,
        offers: {
          "@type": "Offer",
          price: (pkg.retailPrice ?? pkg.price).toFixed(2),
          priceCurrency: "TRY",
          availability: "https://schema.org/InStock",
          url: `${siteUrl}/${platformSlug}/${categorySlug}`,
          seller: { "@type": "Organization", name: "OptiSMM" },
        },
      },
    })),
  } : null;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `${platformName} ${categoryName} satın almak güvenli mi?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Evet, OptiSMM üzerinden yapacağınız ${platformName} ${categoryName} alışverişlerinde 256-bit SSL sertifikası ile korunan ödeme altyapısı kullanılmaktadır. Tüm işlemler güvenli şekilde gerçekleştirilir.`,
        },
      },
      {
        "@type": "Question",
        name: `${platformName} ${categoryName} ne kadar sürede gelir?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Siparişler genellikle birkaç dakika ile birkaç saat içinde başlamaktadır. Teslimat hızı seçilen pakete göre değişmektedir.`,
        },
      },
      {
        "@type": "Question",
        name: `${platformName} ${categoryName} fiyatları ne kadar?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `OptiSMM'ta ${platformName} ${categoryName} paketleri ${packages.length > 0 ? `${(packages[0].retailPrice ?? packages[0].price).toFixed(2)} TL'den başlamaktadır` : "uygun fiyatlarla sunulmaktadır"}. Farklı miktarlar için birden fazla paket seçeneği mevcuttur.`,
        },
      },
      {
        "@type": "Question",
        name: `${platformName} ${categoryName} düşer mi?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Tüm paketlere 30 gün telafi garantisi sunulmaktadır. Sipariş verdiğiniz ${platformName} ${categoryName} düşerse ücretsiz yenileme yapılmaktadır.`,
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/${platformSlug}/${categorySlug}/#webpage`,
    url: `${siteUrl}/${platformSlug}/${categorySlug}`,
    name: `${platformName} ${categoryName} Satın Al | OptiSMM`,
    description: `${platformName} ${categoryName} paketleri. En uygun fiyat, hızlı teslimat, güvenli ödeme.`,
    isPartOf: { "@type": "WebSite", url: siteUrl },
    breadcrumb: { "@type": "BreadcrumbList", itemListElement: breadcrumbSchema.itemListElement },
    inLanguage: "tr",
    dateModified: new Date().toISOString(),
    ...(packages.length > 0 && {
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: packages.length,
        name: `${platformName} ${categoryName} Paketleri`,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-background">
      <Script id="cat-breadcrumb-jsonld" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      {itemListSchema && (
        <Script id="cat-itemlist-jsonld" type="application/ld+json">
          {JSON.stringify(itemListSchema)}
        </Script>
      )}
      <Script id="cat-faq-jsonld" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="cat-webpage-jsonld" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(59,130,246,0.12),transparent)]" />
        <div className="container relative mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/services" className="hover:text-foreground transition-colors">{t("breadcrumbAll")}</Link>
            <ChevronRight size={13} />
            <Link href={`/${platformSlug}`} className="hover:text-foreground transition-colors">{platformName}</Link>
            <ChevronRight size={13} />
            <span className="text-foreground font-medium">{categoryName}</span>
          </nav>

          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles size={12} />
              {t("packageBadge", { count: packages.length })}
            </div>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              {platformName}{" "}
              <span className="text-primary">{categoryName}</span>{" "}
              {t("buyTitle")}
            </h1>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              {t("heroDesc", { category: categoryName.toLowerCase() })}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {trustItems.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
                  <item.icon size={12} className="text-primary" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Packages ── */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          {packages.length === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
              <p className="text-muted-foreground">{t("emptyCategory")}</p>
              <Link href={`/${platformSlug}`} className="mt-4 inline-block text-primary hover:underline text-sm">
                {t("backToCategories", { name: platformName })}
              </Link>
            </div>
          ) : (
            <PackageShowcase
              packages={packages}
              platformName={platformName}
              categoryName={categoryName}
              highlightPopular
            />
          )}
        </div>
      </section>

      {/* ── SEO content ── */}
      <section className="border-t border-white/5 bg-white/[0.01] py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-xl font-bold mb-4">{t("aboutTitle", { platform: platformName, category: categoryName })}</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>{t("aboutP1", { platform: platformName, category: categoryName.toLowerCase() })}</p>
            <p>{t("aboutP2")}</p>
            <p>{t("aboutP3")}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href={`/${platformSlug}`} className="text-primary hover:underline">
              {t("allServices", { name: platformName })}
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <Link href="/services" className="text-muted-foreground hover:text-foreground">
              {t("allPlatforms")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
