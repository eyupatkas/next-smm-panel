import { db } from "@/lib/db";
import { getTranslatedName } from "@/lib/i18n-db";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  Shield, Zap, Clock, Headphones,
} from "lucide-react";
import ServicesSearchClient from "@/components/marketing/ServicesSearchClient";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("services");
  const path = "/services";
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDesc"),
    },
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
  };
}

export default async function MarketingServicesPage() {
  const locale = await getLocale();
  const t = await getTranslations("services");
  type TJson = Record<string, { name?: string }> | null;

  let platforms: {
    id: string;
    name: string;
    slug: string | null;
    subcatCount: number;
    pkgCount: number;
    hotCategories: { name: string; slug: string | null }[];
  }[] = [];

  try {
    const raw = await db.category.findMany({
      where: {
        parentId: null,
        status: true,
        OR: [
          // Alt kategori içinde paket olan platformlar
          { children: { some: { status: true, packages: { some: { status: true } } } } },
          // Doğrudan kök kategoriye bağlı paketi olanlar (combo paketler gibi)
          { packages: { some: { status: true } } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        translations: true,
        _count: {
          select: {
            packages: { where: { status: true } },
            children: { where: { status: true } },
          },
        },
        children: {
          where: { status: true, packages: { some: { status: true } } },
          select: {
            id: true,
            name: true,
            slug: true,
            translations: true,
            _count: { select: { packages: { where: { status: true } } } },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          take: 4,
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    platforms = raw.map((p) => ({
      id: p.id,
      name: getTranslatedName(p.name, p.translations as TJson, locale),
      slug: p.slug,
      subcatCount: p._count.children,
      // Alt kategorilerdeki + doğrudan root'a bağlı paketler (combo dahil)
      pkgCount:
        p.children.reduce((s, c) => s + c._count.packages, 0) +
        p._count.packages,
      hotCategories: p.children
        .filter((c) => c.slug && c._count.packages > 0)
        .slice(0, 4)
        .map((c) => ({
          name: getTranslatedName(c.name, c.translations as TJson, locale),
          slug: c.slug,
        })),
    }));
    // 0 paketli platformları gizle
    platforms = platforms.filter((p) => p.pkgCount > 0);
  } catch (e) {
    console.error("Services page error:", e);
  }

  const totalPackages = platforms.reduce((s, p) => s + p.pkgCount, 0);

  const trustBadges = [
    { icon: Shield, label: t("trustSecure"), desc: t("trustSecureDesc") },
    { icon: Zap, label: t("trustInstant"), desc: t("trustInstantDesc") },
    { icon: Clock, label: t("trustSupport"), desc: t("trustSupportDesc") },
    { icon: Headphones, label: t("trustRefund"), desc: t("trustRefundDesc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)]" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap size={14} />
              {t("badge", { count: platforms.length, packages: totalPackages })}
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {t("heroTitle")}{" "}
              <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {t("heroHighlight")}
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {t("heroDesc")}
            </p>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {trustBadges.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <item.icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Grid (with search) ── */}
      <ServicesSearchClient platforms={platforms} />

      {/* ── FAQ ── */}
      <section className="border-t border-white/5 bg-white/[0.01] py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">{t("faqTitle")}</h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {[
              { q: t("faqDeliveryQ"), a: t("faqDeliveryA") },
              { q: t("faqSafeQ"), a: t("faqSafeA") },
              { q: t("faqPaymentQ"), a: t("faqPaymentA") },
              { q: t("faqDropQ"), a: t("faqDropA") },
            ].map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <p className="font-semibold">{faq.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

