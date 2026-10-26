import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import { AIChatOrder } from "@/components/shared/AIChatOrder";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("sidebar");
  const path = "/ai-order";
  return {
    title: "Yapay Zeka Hızlı Sipariş",
    description: "Sosyal medya hizmetlerimizi üye olmadan, sadece yapay zeka ile sohbet ederek güvenle satın alın.",
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
    },
  };
}

export default function Page() {
  return (
    <div className="container max-w-4xl mx-auto px-4 pt-32 pb-16 md:pt-40 space-y-8 min-h-screen">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500">
          Yapay Zeka Sohbet ile Sipariş
        </h1>
        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
          Herhangi bir kayıt veya üyelik gerektirmeden, asistanımızla yazışarak 30 saniye içinde siparişinizi oluşturun ve PayTR güvencesiyle ödeyin.
        </p>
      </div>
      <AIChatOrder />
    </div>
  );
}
