import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import { EngagementCalculatorClient } from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("tools");
  const path = "/tools/engagement-rate-calculator";
  return {
    title: t("engagement.title"),
    description: t("engagement.desc"),
    keywords: [
      "etkileşim oranı",
      "engagement rate",
      "instagram etkileşim hesaplama",
      "tiktok etkileşim",
      "influencer analiz",
    ],
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
  };
}

export default function Page() {
  return <EngagementCalculatorClient />;
}
