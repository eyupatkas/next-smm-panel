import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import { FontGeneratorClient } from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("tools");
  const path = "/tools/instagram-font-generator";
  return {
    title: t("font.title"),
    description: t("font.desc"),
    keywords: [
      "instagram font",
      "instagram yazı tipi",
      "özel font",
      "bio font",
      "instagram bio yazı tipi",
      "cool text generator",
    ],
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
  };
}

export default function Page() {
  return <FontGeneratorClient />;
}
