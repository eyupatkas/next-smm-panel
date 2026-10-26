import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import { CharacterCounterClient } from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("tools");
  const path = "/tools/character-counter";
  return {
    title: t("character.title"),
    description: t("character.desc"),
    keywords: [
      "karakter sayacı",
      "harf sayacı",
      "kelime sayacı",
      "instagram karakter limiti",
      "twitter karakter limiti",
      "sosyal medya karakter",
    ],
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
  };
}

export default function Page() {
  return <CharacterCounterClient />;
}
