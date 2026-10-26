import "server-only";
import { db } from "@/lib/db";
import { calculateProviderCost } from "@/lib/pricing";
import { applyPricingGuard, getPricingGuard } from "@/lib/pricing-guard";
import { extractSpeedLabel } from "@/lib/service-info";
import Script from "next/script";
import type { Metadata } from "next";
import { MarketingLandingClient } from "@/components/marketing/MarketingLandingClient";
import { getTranslatedName, getTranslatedDescription } from "@/lib/i18n-db";
import { getLocale } from "next-intl/server";

type TJson = Record<string, { name?: string; description?: string }> | null;

type FeaturedPackageRow = {
  id: string;
  serviceId: string;
  name: string;
  quantity: number;
  retailPrice: number | null;
  price: number;
  description: string | null;
  comboItems: unknown;
  translations: TJson;
  category: {
    name: string;
    translations: TJson;
    parent: {
      name: string;
      translations: TJson;
    } | null;
  };
  service: {
    serviceType: string | null;
    price: number;
    name: string;
    canRefill: boolean;
    canCancel: boolean;
    min: number;
    max: number;
    completedOrderCount: number;
  } | null;
};

export const revalidate = 600;

export const metadata: Metadata = {
  title: "OptiSMM | Instagram, TikTok, YouTube Takipçi ve Beğeni Paneli",
  description:
    "Türkiye'nin güvenilir SMM paneli OptiSMM ile Instagram takipçi, TikTok beğeni, YouTube abone satın alın. Hızlı teslimat, güvenli ödeme, 7/24 destek.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "OptiSMM | Instagram Takipçi, TikTok Beğeni, YouTube Abone Paneli",
    description:
      "Instagram, TikTok, YouTube ve Twitter için hızlı, güvenilir ve uygun fiyatlı sosyal medya büyütme hizmetleri.",
    type: "website",
  },
};

export default async function MarketingPage() {
  const locale = await getLocale();
  let featuredPackages: FeaturedPackageRow[] = [];
  let stats = { serviceCount: 0, orderCount: 0, categoryCount: 0, guaranteedCount: 0 };

  try {
    const [pkgRows, serviceCount, orderCount, categoryCount, guaranteedCount] = await Promise.all([
      db.package.findMany({
        where: {
          status: true,
          showOnHomepage: true,
        },
        select: {
          id: true,
          serviceId: true,
          name: true,
          quantity: true,
          retailPrice: true,
          price: true,
          description: true,
          comboItems: true,
          translations: true,
          category: {
            select: {
              name: true,
              translations: true,
              parent: {
                select: { name: true, translations: true },
              },
            },
          },
          service: {
            select: {
              serviceType: true,
              price: true,
              name: true,
              canRefill: true,
              canCancel: true,
              min: true,
              max: true,
              completedOrderCount: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 12,
      }),
      db.service.count({ where: { status: true } }),
      db.service.aggregate({ _sum: { completedOrderCount: true } }),
      db.category.count({ where: { status: true, packages: { some: { status: true } } } }),
      db.package.count({ where: { status: true, service: { canRefill: true } } }),
    ]);

    featuredPackages = pkgRows as FeaturedPackageRow[];
    stats = {
      serviceCount,
      orderCount: orderCount._sum.completedOrderCount ?? 0,
      categoryCount,
      guaranteedCount,
    };
  } catch (error) {
    console.error("Marketing page - featured package query failed:", error);
  }

  const guard = await getPricingGuard();

  const packages = featuredPackages.map((pkg) => {
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
      retailPrice: applyPricingGuard(listed, providerCost, guard),
      price: pkg.price,
      description: getTranslatedDescription(pkg.description, pkg.translations as TJson, locale),
      comboItems: Array.isArray(pkg.comboItems) ? pkg.comboItems as import("@/components/marketing/PackageShowcase").ComboItem[] : null,
      platformName: getTranslatedName(
        pkg.category.parent?.name ?? pkg.category.name,
        (pkg.category.parent?.translations ?? pkg.category.translations) as TJson,
        locale,
      ),
      categoryName: pkg.category.parent
        ? getTranslatedName(pkg.category.name, pkg.category.translations as TJson, locale)
        : null,
      guarantee: pkg.service?.canRefill ?? null,
      canCancel: pkg.service?.canCancel ?? null,
      speedLabel: pkg.service ? extractSpeedLabel(pkg.service.name) : null,
      orderCount: pkg.service?.completedOrderCount ?? 0,
    };
  });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "SMM panel nedir?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SMM (Sosyal Medya Pazarlama) panel, Instagram takipçi, TikTok beğeni, YouTube abone gibi sosyal medya büyütme hizmetlerini toplu ve otomatik olarak satın alabileceğiniz platformdur.",
        },
      },
      {
        "@type": "Question",
        name: "Siparişim ne zaman başlar?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "OptiSMM'ta siparişler genellikle ödeme onayından sonra birkaç dakika içinde başlar. Bazı hizmetler anlık başlarken büyük miktarlı siparişler birkaç saate yayılabilir.",
        },
      },
      {
        "@type": "Question",
        name: "Hesabımın güvenliği risk altında mı?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Hayır. Hesap şifresi istemiyoruz; yalnızca profilinizin herkese açık URL'sini kullanıyoruz. 256-bit SSL ile tüm işlemler güvence altındadır.",
        },
      },
      {
        "@type": "Question",
        name: "Ödeme yöntemleri nelerdir?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kredi kartı, banka kartı ve PayTR altyapısı üzerinden güvenli ödeme kabul edilmektedir. Bayi kullanıcılar bakiye yükleyerek de sipariş verebilir.",
        },
      },
      {
        "@type": "Question",
        name: "Garanti sunuyor musunuz?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Telafi (refill) garantisi yalnızca garantili paketlerde geçerlidir; kapsam ve süre her paketin detayında belirtilir. Garantili paketlerde garanti süresi içinde düşen miktar ücretsiz olarak yenilenir.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="homepage-faq-jsonld" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <MarketingLandingClient
        featuredPackages={packages}
        stats={{
          serviceCount: stats.serviceCount,
          orderCount: stats.orderCount,
          categoryCount: stats.categoryCount,
          guaranteedCount: stats.guaranteedCount,
        }}
      />
    </>
  );
}
