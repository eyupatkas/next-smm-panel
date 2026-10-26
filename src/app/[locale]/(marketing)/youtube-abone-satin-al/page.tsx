import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import {
  PlayCircle,
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
  title: "YouTube Abone Satın Al — Para Kazanma Eşiğini Aş | OptiSMM",
  description:
    "YouTube abone satın al! Kanal büyütme yolculuğunda para kazanma eşiğine hızla ulaşın. Anlık teslimat, şifresiz işlem, garantili paket seçenekleri. OptiSMM ile YouTube kanalınızı büyütün.",
  keywords:
    "youtube abone satın al, youtube abone artırma, ucuz youtube abone, gerçek youtube abone, turkey youtube abone, youtube kanal büyütme",
  alternates: { canonical: `${siteUrl}/youtube-abone-satin-al`, languages: hreflangAlternates("/youtube-abone-satin-al") },
  openGraph: {
    title: "YouTube Abone Satın Al — Para Kazanma Eşiğini Aş | OptiSMM",
    description: "YouTube kanalınızı hızla büyütün. 1.000 abone eşiğine kısa sürede ulaşın.",
    type: "website",
    url: `${siteUrl}/youtube-abone-satin-al`,
    siteName: "OptiSMM",
  },
};

const faqItems = [
  {
    q: "YouTube abone satın almak güvenli mi?",
    a: "OptiSMM olarak gerçek görünümlü profil kalitesinde hesaplardan abone gönderiyoruz. Hesabınıza zarar verebilecek bot tabanlı yöntemler kullanmıyoruz. Şifrenizi asla istemiyoruz.",
  },
  {
    q: "YouTube para kazanma için kaç abone gerekli?",
    a: "YouTube Partner Programı için 1.000 abone ve son 12 ayda 4.000 saat izlenme gereklidir. OptiSMM'ın hızlı abone artırma hizmetiyle bu eşiğe kısa sürede ulaşabilirsiniz.",
  },
  {
    q: "Aboneler ne zaman gelir?",
    a: "Sipariş onaylandıktan sonra çoğu paket için 0–10 dakika içinde gönderim başlar. Büyük paketlerde drip-feed yöntemiyle organik görünümlü akış sağlanır.",
  },
  {
    q: "YouTube abonesi hesabıma zarar verir mi?",
    a: "OptiSMM olarak kaliteli ve gerçekçi profil görünümlü hesaplar kullandığımızdan kanalınıza herhangi bir zarar gelmez. YouTube topluluğu kurallarıyla uyumlu yöntemler kullanıyoruz.",
  },
  {
    q: "Aboneler düşerse ne olur?",
    a: "Kaliteli paketlerimizde düşme oranı son derece düşüktür. Telafi (refill) garantisi yalnızca garantili paketlerde geçerlidir; kapsam ve süre paket detayında belirtilir, garanti süresi içinde düşen miktar ücretsiz tamamlanır.",
  },
];

const features = [
  {
    icon: Zap,
    title: "Anlık Başlangıç",
    desc: "Sipariş onayından sonra dakikalar içinde aboneler gelmeye başlar.",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Şifresiz & Güvenli",
    desc: "Sadece kanal linkiniz yeterli. Şifre veya hesap bilgisi istemiyoruz.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    icon: Globe,
    title: "Türk + Dünya Abone",
    desc: "Yerel veya global büyüme hedefinize uygun paket seçin.",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  {
    icon: HeartHandshake,
    title: "Garantili Paketler",
    desc: "Garantili paketlerde abone düşmesi ücretsiz tamamlanır.",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
  },
  {
    icon: TrendingUp,
    title: "Algoritma Desteği",
    desc: "Abone artışı, kanalınızın YouTube önerilerinde görünürlüğünü artırır.",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    icon: Lock,
    title: "Güvenli Ödeme",
    desc: "PayTR 3D Secure altyapısıyla kartınız tam koruma altında.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
  },
];

const steps = [
  { n: "01", title: "Kanal Linkini Kopyala", desc: "YouTube kanal URL'nizi kopyalayın." },
  { n: "02", title: "Paket Seçin", desc: "Hedeflerinize uygun abone paketini seçin." },
  { n: "03", title: "Ödeme Yapın", desc: "Kredi kartı, banka kartı veya mevcut bakiyeyle ödeme." },
  { n: "04", title: "Aboneler Gelsin", desc: "Dakikalar içinde aboneler kanalınıza ulaşır." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "YouTube Abone Satın Al",
  description: "OptiSMM üzerinden güvenli ve hızlı YouTube abone satın alın. Para kazanma eşiğine hızla ulaşın.",
  provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl },
  areaServed: "TR",
  url: `${siteUrl}/youtube-abone-satin-al`,
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

export default function YouTubeAbonePage() {
  return (
    <>
      <Script id="yt-abone-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="yt-abone-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>

      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">

          {/* Hero */}
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.25),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-red-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <PlayCircle size={22} className="text-white" />
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">
                  YouTube Abone
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                YouTube Abone Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mt-1">
                  Para Kazanma Eşiğini Hızla Aş
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                YouTube'da para kazanmaya başlamak için 1.000 abone eşiği kritiktir. OptiSMM ile
                gerçek görünümlü profillerden hızla abone kazanın; YouTube Partner Programı'na
                katılın ve içerik üretiminden gelir elde etmeye başlayın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/youtube" className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-red-500/30 hover:opacity-90 transition-all">
                  YouTube Paketleri <ArrowRight size={18} />
                </Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">
                  Ücretsiz Kayıt Ol
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Anlık teslimat", "Şifre gerekmez", "Para kazanma desteği", "Garantili seçenekler"].map((t) => (
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
              <h2 className="text-3xl font-bold font-display">YouTube Büyütmede Farkımız</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                İçerik üreticilerinin güvendiği OptiSMM'la YouTube kanalınızı hız ve kaliteyle büyütün.
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
              <h2 className="text-3xl font-bold font-display">4 Adımda YouTube Büyütme</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">YouTube Abone Satın Almanın Önemi</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>
                YouTube Partner Programı (YPP), içerik üreticilerine reklam geliri, kanal üyeliği ve
                süper sohbet gibi monetizasyon araçları sunar. Bu programa katılabilmek için
                <strong className="text-foreground"> en az 1.000 abone ve son 12 ayda 4.000 saat izlenme</strong>
                şartı aranmaktadır. OptiSMM'ın hızlı abone artırma hizmetiyle bu eşiğe çok daha kısa
                sürede ulaşabilirsiniz.
              </p>
              <p>
                YouTube algoritması yeni içerikleri önerecek kanal belirlerken abone sayısını
                <strong className="text-foreground"> kritik bir otorite sinyali</strong> olarak kullanır.
                Yüksek abone sayısı, videonuzun abone olmayan kullanıcılara da önerilme oranını artırır.
                Bu organik keşfedilebilirlik, uzun vadeli kanal büyümesinin temel motorudur.
              </p>
              <p>
                Sponsorluk ve marka iş birlikleri araştıran içerik üreticileri için abone sayısı
                <strong className="text-foreground"> doğrudan gelir kaldıracıdır</strong>. Markalar kanal
                seçerken önce abone sayısına bakar; bu rakam teklife çıkmadan önce güvenilirlik
                değerlendirmesinin ilk filtresidir. OptiSMM ile bu filtreyi kolayca geçin.
              </p>
              <p>
                OptiSMM'ın YouTube abone hizmetleri, drip-feed teslimat seçeneğiyle
                <strong className="text-foreground"> kanalınızın doğal büyüme görünümünü</strong> korur.
                Türk ve dünya abone seçenekleriyle yerel veya global büyüme stratejinize tam uyum
                sağlayan bir çözüm sunar.
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
          <div className="rounded-[2.5rem] border border-red-500/30 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.2),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-red-500/10">
            <BadgeCheck size={40} className="text-red-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Kanalını Para Kazanmaya Hazırla</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">
              OptiSMM'a ücretsiz kayıt ol, YouTube abone paketini seç ve 1.000 abone eşiğini bugünden aş.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/youtube" className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-red-500/30 hover:opacity-90 transition-all text-base">
                YouTube Paketlerini İncele <ArrowRight size={20} />
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
