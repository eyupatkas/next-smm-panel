import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import {
  Users,
  ShieldCheck,
  Zap,
  TrendingUp,
  Star,
  CheckCircle2,
  ArrowRight,
  Clock,
  HeartHandshake,
  BadgeCheck,
  MapPin,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "Instagram Türk Takipçi Satın Al — Organik Görünümlü | OptiSMM",
  description:
    "Instagram Türk takipçi satın al! Gerçek Türk profilleriyle hesabınızı büyütün. Anlık teslimat, şifresiz işlem, garantili paket seçenekleri. OptiSMM güvencesiyle yerel kitlenize ulaşın.",
  keywords:
    "instagram türk takipçi satın al, türk takipçi, instagram türk takipçi, gerçek türk takipçi, ucuz türk takipçi, organik türk takipçi",
  alternates: { canonical: `${siteUrl}/instagram-turk-takipci-satin-al`, languages: hreflangAlternates("/instagram-turk-takipci-satin-al") },
  openGraph: {
    title: "Instagram Türk Takipçi Satın Al | OptiSMM",
    description:
      "Gerçek Türk profillerle takipçi kazanın. Yerel kitleye ulaşın, keşfet sıralamanızı güçlendirin.",
    type: "website",
    url: `${siteUrl}/instagram-turk-takipci-satin-al`,
    siteName: "OptiSMM",
  },
};

const faqItems = [
  {
    q: "Türk takipçi ile yabancı takipçi arasındaki fark nedir?",
    a: "Türk takipçiler Türkiye'deki gerçek kullanıcı profilleridir. Yerel keşfet sıralamasını, yerel marka güvenilirliğini ve Türkiye pazarına yönelik etkileşimi doğrudan etkiler. Yabancı takipçi ise uluslararası görünürlük için tercih edilir.",
  },
  {
    q: "Türk takipçiler organik görünüyor mu?",
    a: "OptiSMM'ın Türk takipçi hizmetleri, profil fotoğrafı, gönderi paylaşımı ve takip geçmişiyle gerçekçi görünen hesaplardan oluşur. Böylece hesabınızın doğal büyüme görünümü korunur.",
  },
  {
    q: "Ne kadar sürede gelir?",
    a: "Sipariş onaylandıktan 0–5 dakika içinde teslimat başlar. Büyük paketlerde drip-feed yöntemiyle ağır ama organik görünümlü bir akış sağlanır.",
  },
  {
    q: "Türk takipçi hesabıma zarar verir mi?",
    a: "Yalnızca kaliteli ve gerçekçi profiller kullandığımız için hesabınıza herhangi bir zarar gelmez. Şifrenizi asla istemiyoruz; tek ihtiyaç kullanıcı adınızdır.",
  },
  {
    q: "Takipçiler düşerse ne olur?",
    a: "Yüksek kaliteli paketlerimizde düşme oranı son derece düşüktür. Telafi (refill) garantisi yalnızca garantili paketlerde geçerlidir; kapsam ve süre paket detayında belirtilir, garanti süresi içinde düşen miktar ücretsiz tamamlanır.",
  },
];

const features = [
  {
    icon: MapPin,
    title: "Gerçek Türk Profiller",
    desc: "Türkiye lokasyonlu, aktif profil görünümlü hesaplardan teslimat.",
    color: "text-red-400",
    bg: "bg-red-500/15",
  },
  {
    icon: Zap,
    title: "Anlık Başlangıç",
    desc: "Sipariş onayından saniyeler sonra akış başlar.",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Şifresiz & Güvenli",
    desc: "Hiçbir zaman hesap şifrenizi istemiyoruz.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    icon: HeartHandshake,
    title: "Garantili Paketler",
    desc: "Düşme olursa ücretsiz tamamlarız. Kaliteden ödün vermeyiz.",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
  },
  {
    icon: TrendingUp,
    title: "Yerel Keşfet Avantajı",
    desc: "Türk takipçiler Türkiye keşfet sıralamanızı doğrudan destekler.",
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
  { n: "01", title: "Paketi Seçin", desc: "Türk takipçi kategorisinden bütçenize uygun paketi seçin." },
  { n: "02", title: "Kullanıcı Adı Girin", desc: "Instagram kullanıcı adınızı girin. Şifre gerekmez." },
  { n: "03", title: "Ödeme Yapın", desc: "Kredi kartı, banka kartı veya mevcut bakiyeyle ödeme." },
  { n: "04", title: "Takipçiler Gelsin", desc: "Dakikalar içinde Türk takipçiler profilinize ulaşır." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Instagram Türk Takipçi Satın Al",
  description: "OptiSMM üzerinden güvenli ve hızlı Instagram Türk takipçi satın alın. Gerçek görünümlü Türk profiller, anlık teslimat.",
  provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl },
  areaServed: "TR",
  url: `${siteUrl}/instagram-turk-takipci-satin-al`,
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

export default function InstagramTurkTakipciPage() {
  return (
    <>
      <Script id="turk-takipci-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="turk-takipci-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>

      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">

          {/* Hero */}
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.25),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-red-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Users size={22} className="text-white" />
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">
                  Türk Takipçi
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                Instagram Türk Takipçi Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mt-1">
                  Organik Görünümlü, Gerçek Türk Profiller
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                Yerel kitlenizi büyütmek mi istiyorsunuz? OptiSMM'ın Türk takipçi hizmetiyle
                profilinize gerçek görünümlü Türkiye lokasyonlu takipçiler kazandırın. Yerel
                keşfet görünürlüğünüzü artırın, güvenilirliğinizi pekiştirin.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-red-500/30 hover:opacity-90 transition-all">
                  Türk Takipçi Paketleri <ArrowRight size={18} />
                </Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">
                  Ücretsiz Kayıt Ol
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Anlık teslimat", "Şifre gerekmez", "Türk profiller", "Garantili seçenekler"].map((t) => (
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
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Neden Türk Takipçi?</p>
              <h2 className="text-3xl font-bold font-display">Yerel Büyümenin Gücü</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Türkiye pazarına yönelik hesap büyütmede Türk takipçiler kritik bir avantaj sağlar.
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
              <h2 className="text-3xl font-bold font-display">4 Adımda Türk Takipçi</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">Neden Instagram Türk Takipçi Satın Almalısınız?</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>
                Instagram algoritması, hesabınızın hangi kitleye önerileceğini belirlerken takipçilerinizin
                coğrafyasını göz önünde bulundurur. Türk takipçiler, içeriklerinizin
                <strong className="text-foreground"> Türkiye keşfet sıralamasında</strong> öncelikli olarak
                gösterilmesini destekler. Bu özellik, yerel marka ve girişimciler için paha biçilmez bir
                rekabet avantajıdır.
              </p>
              <p>
                Türkiye'de 35 milyonu aşan Instagram kullanıcısı arasında öne çıkabilmek için güçlü bir
                profil görünümü şarttır. Türk takipçi sayısı yüksek hesaplar,
                <strong className="text-foreground"> yerel kullanıcılarda sosyal kanıt etkisi</strong> yaratır;
                bu da organik takipçi dönüşümünü ve iş birliği tekliflerini artırır.
              </p>
              <p>
                E-ticaret yapan girişimciler, yerel influencer'lar ve Türkiye'yi hedefleyen markalar için
                Türk takipçi büyümesi bir
                <strong className="text-foreground"> doğrudan satış kaldıracı</strong>dır. Potansiyel müşteriler
                profilinizde binlerce Türk takipçi gördüğünde markanıza güven duyar ve satın alma
                kararlarını kolaylaştırır.
              </p>
              <p>
                OptiSMM'ın Türk takipçi hizmetleri, drip-feed teslimat seçeneğiyle hesabınızın
                <strong className="text-foreground"> doğal büyüme görünümünü</strong> korur. Anlık büyük
                artışlar yerine organik ve sürdürülebilir bir ivme yaratarak Instagram algoritmalarıyla
                uyumlu işleme devam eder.
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
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Türkiye'de Öne Çık</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">
              OptiSMM'a ücretsiz kayıt ol, Türk takipçi paketini seç ve yerel etkini bugünden artır.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-red-500/30 hover:opacity-90 transition-all text-base">
                Türk Takipçi Paketleri <ArrowRight size={20} />
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
