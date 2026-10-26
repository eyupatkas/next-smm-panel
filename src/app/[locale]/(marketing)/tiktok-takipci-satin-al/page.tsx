import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import {
  Music2,
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
  title: "TikTok Takipçi Satın Al — Anlık, Güvenli, Ucuz | OptiSMM",
  description:
    "TikTok takipçi satın al! Gerçek görünümlü profillerle TikTok hesabını hızla büyüt. Anlık teslimat, şifresiz işlem, garantili paket seçenekleri. OptiSMM ile viral olma yolculuğu başlıyor.",
  keywords:
    "tiktok takipçi satın al, tiktok takipçi artırma, ucuz tiktok takipçi, gerçek tiktok takipçi, türk tiktok takipçi, tiktok hesap büyütme",
  alternates: { canonical: `${siteUrl}/tiktok-takipci-satin-al`, languages: hreflangAlternates("/tiktok-takipci-satin-al") },
  openGraph: {
    title: "TikTok Takipçi Satın Al — Anlık & Ucuz | OptiSMM",
    description:
      "TikTok hesabını hızla büyüt. Gerçek görünümlü takipçiler, anlık teslimat, güvenli ödeme.",
    type: "website",
    url: `${siteUrl}/tiktok-takipci-satin-al`,
    siteName: "OptiSMM",
  },
};

const faqItems = [
  {
    q: "TikTok takipçi satın almak güvenli mi?",
    a: "OptiSMM olarak gerçek görünümlü, aktif profil kalitesinde hesaplardan takipçi gönderiyoruz. Hesabınıza zarar verebilecek bot tabanlı yöntemler kullanmıyoruz. Şifrenizi asla istemiyoruz.",
  },
  {
    q: "TikTok takipçiler ne zaman gelir?",
    a: "Sipariş onaylandıktan sonra çoğu paket için 0–10 dakika içinde gönderim başlar. Büyük paketlerde drip-feed yöntemi kullanılarak daha organik bir büyüme sağlanır.",
  },
  {
    q: "TikTok takipçi almak For You (Keşfet) sayfasını etkiler mi?",
    a: "TikTok algoritması yüksek takipçili hesapların içeriklerini For You sayfasında daha sık önerir. Takipçi artışı, ilk algoritma ivmesini kazanmak için etkili bir yöntemdir.",
  },
  {
    q: "En az kaç takipçi satın almalıyım?",
    a: "TikTok'un para kazanma ve canlı yayın özelliklerine erişim için belirli takipçi eşikleri vardır (1.000, 10.000 vb.). İhtiyacınıza göre küçük paketlerle başlayabilir, zamanla artırabilirsiniz.",
  },
  {
    q: "Takipçi düşerse ne olur?",
    a: "Kaliteli paketlerimizde düşme oranı son derece düşüktür. Telafi (refill) garantisi yalnızca garantili paketlerde geçerlidir; kapsam ve süre paket detayında belirtilir, garanti süresi içinde düşen miktar ücretsiz tamamlanır.",
  },
];

const features = [
  {
    icon: Zap,
    title: "Anlık Başlangıç",
    desc: "Sipariş onayından dakikalar sonra TikTok takipçileri gelmeye başlar.",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Şifresiz & Güvenli",
    desc: "Sadece kullanıcı adınız yeterli. Hesap şifresi asla istemiyoruz.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    icon: Globe,
    title: "Türk + Dünya Takipçi",
    desc: "Yerel veya global büyüme hedefinize göre uygun paketi seçin.",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  {
    icon: HeartHandshake,
    title: "Garantili Paketler",
    desc: "Garantili paketlerde takipçi düşmesi ücretsiz tamamlanır.",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
  },
  {
    icon: TrendingUp,
    title: "For You Desteği",
    desc: "Takipçi artışı TikTok algoritmik görünürlüğünü doğrudan destekler.",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    icon: Lock,
    title: "Güvenli Ödeme",
    desc: "PayTR 3D Secure altyapısıyla güvenli ödeme altyapısı.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
  },
];

const steps = [
  { n: "01", title: "Paket Seçin", desc: "TikTok takipçi kategorisinden hedeflerinize uygun paketi seçin." },
  { n: "02", title: "Kullanıcı Adı Girin", desc: "TikTok kullanıcı adınızı girin. Şifre gerekmez." },
  { n: "03", title: "Ödeme Yapın", desc: "Kredi kartı, banka kartı veya mevcut bakiyeyle ödeme." },
  { n: "04", title: "Takipçiler Gelsin", desc: "Dakikalar içinde TikTok takipçileriniz hesabınıza ulaşır." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "TikTok Takipçi Satın Al",
  description: "OptiSMM üzerinden güvenli ve hızlı TikTok takipçi satın alın.",
  provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl },
  areaServed: "TR",
  url: `${siteUrl}/tiktok-takipci-satin-al`,
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

export default function TikTokTakipciPage() {
  return (
    <>
      <Script id="tiktok-takipci-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="tiktok-takipci-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>

      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">

          {/* Hero */}
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(20,184,166,0.25),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-teal-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Music2 size={22} className="text-white" />
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">
                  TikTok Hizmetleri
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                TikTok Takipçi Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400 mt-1">
                  Viral Yolculuğun Başlangıcı
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                TikTok'ta ivme kazanmak için takipçi sayısı kritiktir. OptiSMM'ın TikTok takipçi
                hizmetiyle gerçek görünümlü profillerden hızla takipçi kazanın; For You sayfasında
                öne çıkın ve organik büyümenizi hızlandırın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/tiktok" className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-teal-500/30 hover:opacity-90 transition-all">
                  TikTok Paketleri <ArrowRight size={18} />
                </Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">
                  Ücretsiz Kayıt Ol
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Anlık teslimat", "Şifre gerekmez", "For You desteği", "Garantili seçenekler"].map((t) => (
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
              <h2 className="text-3xl font-bold font-display">TikTok Büyütmede Farkımız</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Hız, güvenlik ve kaliteyi bir arada sunan OptiSMM ile TikTok büyümenizi hızlandırın.
              </p>
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
              <h2 className="text-3xl font-bold font-display">4 Adımda TikTok Büyütme</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">TikTok Takipçi Satın Almanın Faydaları</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>
                TikTok, dünyada 1 milyarı aşan aktif kullanıcısıyla sosyal medyanın en hızlı büyüyen
                platformudur. Bu devasa havuzda öne çıkabilmek için
                <strong className="text-foreground"> takipçi sayısı ve etkileşim oranı</strong> iki kritik faktördür.
                For You sayfası algoritması, takipçisi yüksek hesapların yeni içeriklerini daha geniş
                kitlelere sunar.
              </p>
              <p>
                TikTok'ta para kazanma özelliklerine erişmek için belirli takipçi eşiklerini aşmak
                gerekir. <strong className="text-foreground">1.000 takipçi</strong> canlı yayın için,
                <strong className="text-foreground"> 10.000 takipçi</strong> ise TikTok Creator Fund ve
                biyografiye link ekleme için gereklidir. OptiSMM'ın hızlı teslimat paketiyle bu
                eşiklere kısa sürede ulaşabilirsiniz.
              </p>
              <p>
                Marka iş birlikleri ve sponsorlu içerik geliri için TikTok hesabınızın
                <strong className="text-foreground"> güçlü bir ilk izlenim</strong> yaratması şarttır.
                Potansiyel iş ortakları profilinizi ziyaret ettiğinde yüksek takipçi sayısı hesabın
                aktif ve güvenilir olduğunu gösterir. Bu da pazarlık gücünüzü ve teklif kalitesini artırır.
              </p>
              <p>
                OptiSMM'ın TikTok takipçi hizmetleri Türk ve uluslararası seçenekleriyle
                <strong className="text-foreground"> her büyüme stratejisine</strong> uyum sağlar.
                Türkiye'de yerel bir içerik üreticisiyseniz Türk takipçi paketiyle; global bir
                hitap hedefliyorsanız dünya takipçisi paketiyle büyümenizi optimize edebilirsiniz.
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
          <div className="rounded-[2.5rem] border border-teal-500/30 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.2),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-teal-500/10">
            <BadgeCheck size={40} className="text-teal-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">For You'ya Çık</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">
              OptiSMM'a ücretsiz kayıt ol, TikTok takipçi paketini seç ve viral yolculuğuna başla.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/tiktok" className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-teal-500/30 hover:opacity-90 transition-all text-base">
                TikTok Paketlerini İncele <ArrowRight size={20} />
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
