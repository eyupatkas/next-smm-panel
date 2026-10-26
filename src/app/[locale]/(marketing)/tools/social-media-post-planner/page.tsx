import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import { PostPlannerClient } from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("tools");
  const path = "/tools/social-media-post-planner";
  return {
    title: t("planner.title"),
    description: t("planner.desc"),
    keywords: [
      "paylaşım planlayıcı",
      "en iyi paylaşım saati",
      "instagram paylaşım saati",
      "tiktok paylaşım zamanı",
      "sosyal medya takvim",
      "content planner",
    ],
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
  };
}

export default function Page() {
  return <PostPlannerClient />;
}
