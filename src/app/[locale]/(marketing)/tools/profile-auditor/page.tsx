import type { Metadata } from "next";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import { ProfileAuditorClient } from "@/app/[locale]/(marketing)/tools/profile-auditor/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const path = "/tools/profile-auditor";
  
  return {
    title: locale === "tr" 
      ? "AI Profil Analizörü & Sosyal Medya Denetleyicisi | OptiSMM" 
      : "AI Profile Auditor & Social Media Checker | OptiSMM",
    description: locale === "tr"
      ? "Instagram, TikTok ve YouTube profilinizi yapay zeka ile ücretsiz analiz edin, zayıf ve güçlü yanlarınızı keşfedip organik büyüme önerileri alın."
      : "Free AI-powered analysis for your Instagram, TikTok, and YouTube profile. Discover strengths, weaknesses, and get custom organic growth recommendations.",
    keywords: [
      "profile auditor",
      "profil analizörü",
      "instagram analiz",
      "tiktok analiz",
      "youtube kanal analizi",
      "ücretsiz sosyal medya araçları",
      "optismm tools",
    ],
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
  };
}

export default function Page() {
  return <ProfileAuditorClient />;
}
