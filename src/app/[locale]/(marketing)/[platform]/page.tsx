import { db } from "@/lib/db";
import { getTranslatedName } from "@/lib/i18n-db";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import {
  Heart, Music2, Play, MessageCircle, Globe, Users, Zap,
  TrendingUp, Sparkles, Rocket, ChevronRight, Shield, Clock, Headphones,
} from "lucide-react";
import { getPlatformStyle } from "@/lib/platform-styles";

// ISR: 5 dakika cache, server-render at request after stale
export const revalidate = 300;

/* ─── Helpers ─────────────────────────────────────────────────────── */

type TJson = Record<string, { name?: string }> | null;

function getCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("takipç") || n.includes("abone") || n.includes("üye") || n.includes("follow")) return Users;
  if (n.includes("beğen") || n.includes("like")) return Heart;
  if (n.includes("izlenme") || n.includes("view") || n.includes("görünt")) return TrendingUp;
  if (n.includes("yorum") || n.includes("comment")) return MessageCircle;
  if (n.includes("paylaş") || n.includes("retweet") || n.includes("share")) return Rocket;
  if (n.includes("müzik") || n.includes("dinlen") || n.includes("stream")) return Music2;
  if (n.includes("canlı") || n.includes("live")) return Play;
  return Sparkles;
}

/* ─── Metadata ─────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string; locale: string }>;
}): Promise<Metadata> {
  const { platform: platformSlug, locale } = await params;
  const t = await getTranslations("platform");

  const platform = await db.category.findFirst({
    where: { slug: platformSlug, parentId: null, status: true },
    select: { name: true },
  });

  if (!platform) return {};

  const path = `/${platformSlug}`;

  return {
    title: t("metaTitle", { name: platform.name }),
    description: t("metaDesc", { name: platform.name }),
    keywords: t("metaKeywords", { name: platform.name }),
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
    openGraph: {
      title: t("metaOgTitle", { name: platform.name }),
      description: t("metaDesc", { name: platform.name }),
      url: canonicalUrl(locale, path),
      type: "website",
      locale: "tr_TR",
      alternateLocale: ["en_US", "de_DE", "ar_SA", "zh_CN", "fr_FR", "es_ES"],
      siteName: "OptiSMM",
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaOgTitle", { name: platform.name }),
      description: t("metaDesc", { name: platform.name }),
    },
  };
}

/* ─── Page Component ─────────────────────────────────────────────────── */

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ platform: string; locale: string }>;
}) {
  const { platform: platformSlug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("platform");

  const platform = await db.category.findFirst({
    where: { slug: platformSlug, parentId: null, status: true },
    select: {
      id: true,
      name: true,
      translations: true,
      children: {
        where: { status: true },
        select: {
          id: true,
          name: true,
          slug: true,
          translations: true,
          _count: { select: { packages: { where: { status: true } } } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!platform) notFound();

  const platformName = getTranslatedName(platform.name, platform.translations as TJson, locale);
  const meta = getPlatformStyle(platformSlug);

  // Sadece paketi olan kategorileri göster
  const visibleChildren = platform.children.filter((c) => c._count.packages > 0);

  const trustItems = [
    { icon: Shield, label: t("trustSecure"), desc: t("trustSecureDesc") },
    { icon: Zap, label: t("trustFast"), desc: t("trustFastDesc") },
    { icon: Clock, label: t("trustGuarantee"), desc: t("trustGuaranteeDesc") },
    { icon: Headphones, label: t("trustSupport"), desc: t("trustSupportDesc") },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Tüm Platformlar", item: `${siteUrl}/services` },
      { "@type": "ListItem", position: 3, name: platformName, item: `${siteUrl}/${platformSlug}` },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${platformName} Paketleri`,
    description: `${platformName} için takipçi, beğeni ve izlenme paketleri`,
    numberOfItems: visibleChildren.length,
    itemListElement: visibleChildren.map((cat, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: getTranslatedName(cat.name, cat.translations as TJson, locale),
      url: `${siteUrl}/${platformSlug}/${cat.slug}`,
      item: {
        "@type": "Service",
        name: `${platformName} ${getTranslatedName(cat.name, cat.translations as TJson, locale)} Satın Al`,
        url: `${siteUrl}/${platformSlug}/${cat.slug}`,
        provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl },
        areaServed: "TR",
        availableChannel: {
          "@type": "ServiceChannel",
          serviceUrl: `${siteUrl}/${platformSlug}/${cat.slug}`,
        },
      },
    })),
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/${platformSlug}/#webpage`,
    url: `${siteUrl}/${platformSlug}`,
    name: `${platformName} Hizmetleri | OptiSMM`,
    description: `${platformName} için takipçi, beğeni ve izlenme paketleri`,
    isPartOf: { "@type": "WebSite", url: siteUrl },
    breadcrumb: { "@type": "BreadcrumbList", itemListElement: breadcrumbSchema.itemListElement },
    inLanguage: "tr",
    dateModified: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-background">
      <Script id="platform-breadcrumb-jsonld" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="platform-itemlist-jsonld" type="application/ld+json">
        {JSON.stringify(itemListSchema)}
      </Script>
      <Script id="platform-webpage-jsonld" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-16">
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-50`} />
        <div className="container relative mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/services" className="hover:text-foreground transition-colors">{t("breadcrumbAll")}</Link>
            <ChevronRight size={14} />
            <span className={meta.color}>{platformName}</span>
          </nav>

          <div className="mx-auto max-w-3xl text-center">
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 ${meta.bg} px-4 py-1.5 text-sm font-medium ${meta.color}`}>
              <Sparkles size={14} />
              {t("categoryCount", { count: visibleChildren.length })}
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {platformName}{" "}
              <span className={`bg-gradient-to-r ${meta.gradient.replace("/20", "")} bg-clip-text text-transparent`}>
                {t("titleSuffix")}
              </span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {t("defaultDesc", { name: platformName })} {t("descSuffix")}
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4 max-w-3xl mx-auto">
            {trustItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <div className={`rounded-lg ${meta.bg} p-2 ${meta.color}`}>
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-xl font-bold sm:text-2xl">
            {t("sectionTitle", { name: platformName })}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleChildren.map((sub) => {
              const Icon = getCategoryIcon(sub.name);
              const subName = getTranslatedName(sub.name, sub.translations as TJson, locale);
              const pkgCount = sub._count.packages;

              const content = (
                <div className="group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-primary/20 hover:bg-primary/[0.03] hover:shadow-lg">
                  <div className={`shrink-0 rounded-xl ${meta.bg} p-3 ${meta.color} transition-colors group-hover:bg-primary/20`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{subName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pkgCount > 0 ? t("packageCount", { count: pkgCount }) : t("comingSoon")}
                    </p>
                  </div>
                  <ChevronRight className="shrink-0 mt-0.5 text-muted-foreground/40 transition-colors group-hover:text-primary" size={18} />
                </div>
              );

              if (sub.slug && pkgCount > 0) {
                return (
                  <Link key={sub.id} href={`/${platformSlug}/${sub.slug}`}>
                    {content}
                  </Link>
                );
              }

              return <div key={sub.id} className="opacity-60 cursor-default">{content}</div>;
            })}
          </div>

          {/* Other platforms CTA */}
          <div className="mt-16 rounded-2xl border border-white/5 bg-white/[0.01] p-8 text-center">
            <p className="text-muted-foreground text-sm">{t("otherPlatforms")}</p>
            <Link
              href="/services"
              className="mt-2 inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              {t("viewAll")} <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
