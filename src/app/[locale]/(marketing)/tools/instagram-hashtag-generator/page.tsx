import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import { HashtagGeneratorClient } from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("tools");
  const path = "/tools/instagram-hashtag-generator";
  return {
    title: t("hashtag.title"),
    description: t("hashtag.desc"),
    keywords: [
      "instagram hashtag",
      "hashtag üretici",
      "hashtag generator",
      "instagram etkileşim",
      "popüler hashtagler",
    ],
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
  };
}

export default function Page() {
  return <HashtagGeneratorClient />;
}
