import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import {
  Heart,
  ShieldCheck,
  Zap,
  TrendingUp,
  Star,
  CheckCircle2,
  ArrowRight,
  Clock,
  HeartHandshake,
  BadgeCheck,
  Globe,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "TikTok Beğeni Satın Al — Anlık, Ucuz, Güvenli | OptiSMM",
  description:
    "TikTok beğeni satın al! Videolarınıza anında beğeni kazandırın, For You sayfasında öne çıkın. Anlık teslimat, şifresiz işlem, garantili paket seçenekleri. OptiSMM ile TikTok büyütme.",
  keywords:
    "tiktok beğeni satın al, tiktok beğeni artırma, ucuz tiktok beğeni, gerçek tiktok beğeni, tiktok türk beğeni, tiktok video beğeni",
  alternates: { canonical: `${siteUrl}/tiktok-begeni-satin-al`, languages: hreflangAlternates("/tiktok-begeni-satin-al") },
  openGraph: {
    title: "TikTok Beğeni Satın Al — Anlık & Ucuz | OptiSMM",
    description: "TikTok videolarınıza anında beğeni kazandırın. For You desteği, anlık teslimat.",
    type: "website",
    url: `${siteUrl}/tiktok-begeni-satin-al`,
    siteName: "OptiSMM",
  },
};

const faqItems = [
  {
    q: "TikTok beğeni satın almak güvenli mi?",
    a: "OptiSMM'ın TikTok beğeni hizmetleri, gerçek görünümlü hesaplardan gönderilir. Hesabınızı riske atacak bot tabanlı yöntemler kullanmıyoruz. Şifrenizi asla istemiyoruz.",
  },
  {
    q: "TikTok beğenileri ne zaman gelir?",
    a: "Sipariş onayından sonra çoğu paket için 0–5 dakika içinde gönderim başlar. Büyük paketlerde drip-feed yöntemiyle organik görünümlü bir akış sağlanır.",
  },
  {
    q: "TikTok beğenisi For You sayfasını etkiler mi?",
    a: "Evet. TikTok algoritması yüksek etkileşim alan videoları For You sayfasında öne çıkarır. Beğeni artışı bu sinyali güçlendirir ve daha geniş kitlelere ulaşmanızı sağlar.",
  },
  {
    q: "Tek bir videoya mı, tüm hesaba mı beğeni alabiliyorum?",
    a: "OptiSMM'ta belirli bir video linkine beğeni alabilirsiniz. Birden fazla videoya beğeni almak isterseniz ayrı siparişler oluşturabilirsiniz.",
  },
  {
    q: "Beğeniler düşerse ne olur?",
    a: "Kaliteli paketlerimizde düşme oranı son derece düşüktür. Telafi (refill) garantisi yalnızca garantili paketlerde geçerlidir; kapsam ve süre paket detayında belirtilir, garanti süresi içinde düşen miktar ücretsiz tamamlanır.",
  },
];

const features = [
  {
    icon: Zap,
    title: "Anlık Başlangıç",
    desc: "Sipariş onayından dakikalar sonra beğeniler gelmeye başlar.",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Video Linki Yeterli",
    desc: "Sadece video linkinizi girin. Hesap şifresi asla gerekmez.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    icon: Globe,
    title: "Türk + Dünya Beğeni",
    desc: "Türk veya uluslararası beğeni seçeneğiyle hedef kitlenize ulaşın.",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  {
    icon: HeartHandshake,
    title: "Garantili Paketler",
    desc: "Garantili paketlerde beğeni düşmesi ücretsiz tamamlanır.",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
  },
  {
    icon: TrendingUp,
    title: "For You Algoritma Desteği",
    desc: "Yüksek etkileşim, videonuzu TikTok keşfet sayfasına taşır.",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    icon: Lock,
    title: "Güvenli Ödeme",
    desc: "PayTR 3D Secure altyapısıyla güvenli ödeme.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
  },
];

const steps = [
  { n: "01", title: "Video Linkini Kopyala", desc: "Beğeni almak istediğiniz TikTok videosunun linkini kopyalayın." },
  { n: "02", title: "Paket Seçin", desc: "İhtiyacınıza ve bütçenize uygun beğeni paketini seçin." },
  { n: "03", title: "Ödeme Yapın", desc: "Kredi kartı, banka kartı veya mevcut bakiyeyle ödeme." },
  { n: "04", title: "Beğeniler Gelsin", desc: "Dakikalar içinde beğeniler videonuza ulaşır." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "TikTok Beğeni Satın Al",
  description: "OptiSMM üzerinden hızlı TikTok beğeni satın alın. For You desteği, anlık teslimat.",
  provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl },
  areaServed: "TR",
  url: `${siteUrl}/tiktok-begeni-satin-al`,
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function TikTokBegeniPage() {
  return (
    <>
      <Script id="tiktok-begeni-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="tiktok-begeni-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>

      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">

          {/* Hero */}
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(251,113,133,0.25),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-rose-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Heart size={22} className="text-white" fill="white" />
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">
                  TikTok Beğeni
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                TikTok Beğeni Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400 mt-1">
                  Videolarını For You&apos;ya Taşı
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                TikTok videolarınızın etkileşimini artırmak mı istiyorsunuz? OptiSMM ile
                anlık TikTok beğenisi kazanın; For You algoritmasının dikkatini çekin ve
                organik erişiminizi katlayın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/tiktok" className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-rose-500/30 hover:opacity-90 transition-all">
                  TikTok Beğeni Paketleri <ArrowRight size={18} />
                </Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">
                  Ücretsiz Kayıt Ol
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Anlık teslimat", "Sadece video linki", "For You desteği", "Garantili seçenekler"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Özellikler */}
          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Neden OptiSMM?</p>
              <h2 className="text-3xl font-bold font-display">TikTok Beğenide Farkımız</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card key={f.title} className="border-white/10 bg-gradient-to-br from-card to-card/60 shadow-xl hover:border-white/20 transition-all hover:-translate-y-0.5">
                  <CardContent className="p-6">
                    <div className={`w-11 h-11 rounded-2xl ${f.bg} flex items-center justify-center mb-4`}>
                      <f.icon size={22} className={f.color} />
                    </div>
                    <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-6">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Nasıl Çalışır */}
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-card to-card/70 p-8 md:p-12">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Süreç</p>
              <h2 className="text-3xl font-bold font-display">4 Adımda TikTok Beğeni</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              {steps.map((s) => (
                <div key={s.n}>
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                    <span className="text-lg font-black text-primary">{s.n}</span>
                  </div>
                  <h3 className="font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-6">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* İçerik */}
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold font-display mb-6">TikTok Beğeni Neden Bu Kadar Önemli?</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>
                TikTok algoritması içerikleri değerlendirirken ilk birkaç saatte aldığı etkileşim
                sinyallerine büyük ağırlık verir. Beğeni, yorum ve paylaşım sayısı yüksek videolar
                <strong className="text-foreground"> For You sayfasında öncelikli gösterilir</strong>.
                Bu kritik ilk pencereyi kazanmak için başlangıç beğenisi almak organik büyümenin
                en akıllıca tetikleyicisidir.
              </p>
              <p>
                İçerik üreticileri ve markalar için TikTok beğeni sayısı,
                <strong className="text-foreground"> sosyal kanıt ve güvenilirlik sinyali</strong>dir.
                For You sayfasında karşılaştıkları bir videoda binlerce beğeni gören kullanıcılar
                içeriği izlemeye, hesabı takip etmeye ve paylaşmaya çok daha yatkın davranır.
              </p>
              <p>
                Markalar TikTok kampanyası değerlendirmesinde
                <strong className="text-foreground"> video başına ortalama etkileşim oranını</strong>
                temel kriter olarak kullanır. Beğeni sayısı yüksek içerikler, influencer anlaşmalarında
                daha iyi pazarlık koşulları ve daha yüksek sponsorluk gelirleri anlamına gelir.
              </p>
              <p>
                OptiSMM'ın TikTok beğeni hizmetleri, Türk ve uluslararası seçenekleriyle
                <strong className="text-foreground"> her büyüme stratejisine</strong> uyum sağlar.
                Yerel bir sanatçı veya içerik üreticisiyseniz Türk beğeni paketiyle Türkiye For You
                sıralamasında öne çıkın; global hitap hedefliyorsanız dünya beğeni paketiyle
                uluslararası görünürlüğünüzü güçlendirin.
              </p>
            </div>
          </div>

          {/* SSS */}
          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Sık Sorulan Sorular</p>
              <h2 className="text-3xl font-bold font-display">Merak Ettikleriniz</h2>
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              {faqItems.map(({ q, a }) => (
                <details key={q} className="group rounded-2xl border border-white/10 bg-card/60 hover:border-white/20 transition-all">
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-sm select-none list-none">
                    <span>{q}</span>
                    <Star size={14} className="shrink-0 text-primary/60 group-open:text-primary transition-colors" />
                  </summary>
                  <p className="px-6 pb-5 text-sm text-muted-foreground leading-7">{a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-[2.5rem] border border-rose-500/30 bg-[radial-gradient(ellipse_at_top,rgba(251,113,133,0.2),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-rose-500/10">
            <BadgeCheck size={40} className="text-rose-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Videonu For You&apos;ya Taşı</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">
              OptiSMM'a ücretsiz kayıt ol, beğeni paketini seç ve videonun etkileşiminin nasıl patladığını gör.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/tiktok" className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-rose-500/30 hover:opacity-90 transition-all text-base">
                TikTok Beğeni Paketleri <ArrowRight size={20} />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all">
                <Clock size={16} /> 7/24 Destek
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
