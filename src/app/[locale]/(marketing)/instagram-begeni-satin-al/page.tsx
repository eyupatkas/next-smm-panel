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
  title: "Instagram Beğeni Satın Al — Anlık, Gerçek, Ucuz | OptiSMM",
  description:
    "Instagram beğeni satın al! Türk ve dünya beğenisi seçenekleriyle gönderilerinizi öne çıkarın. Anlık teslimat, güvenli ödeme, 7/24 destek. OptiSMM ile keşfete düşün.",
  keywords:
    "instagram beğeni satın al, türk instagram beğeni, ucuz instagram beğeni, gerçek instagram beğeni, instagram beğeni artırma, organik instagram beğeni",
  alternates: { canonical: `${siteUrl}/instagram-begeni-satin-al`, languages: hreflangAlternates("/instagram-begeni-satin-al") },
  openGraph: {
    title: "Instagram Beğeni Satın Al — Anlık & Ucuz | OptiSMM",
    description:
      "Gönderilerinize anında beğeni kazandırın. Türk ve dünya beğenisi, anlık teslimat, güvenli ödeme.",
    type: "website",
    url: `${siteUrl}/instagram-begeni-satin-al`,
    siteName: "OptiSMM",
  },
};

const faqItems = [
  {
    q: "Instagram beğeni satın almak güvenli mi?",
    a: "OptiSMM olarak gerçek görünümlü, kaliteli profillerden beğeni gönderiyoruz. Hesabınıza zarar verebilecek bot tabanlı yöntemler kullanmıyoruz. İşlemler Instagram'ın API politikalarıyla uyumlu şekilde yürütülür.",
  },
  {
    q: "Beğeniler ne kadar sürede gelir?",
    a: "Sipariş onaylandıktan sonra çoğu paket için 0–5 dakika içinde teslimat başlar. Büyük hacimli siparişlerde drip-feed (yavaş akış) seçeneğiyle daha organik bir görünüm sağlanır.",
  },
  {
    q: "Türk beğeni mi, dünya beğenisi mi seçmeliyim?",
    a: "Türkiye pazarına hitap eden bir hesap işletiyorsanız Türk beğeni; uluslararası içerik üretiyorsanız dünya beğenisi daha etkilidir. Her iki seçeneği de OptiSMM'ta bulabilirsiniz.",
  },
  {
    q: "Beğeniler düşer mi?",
    a: "Kaliteli paketlerde düşme oranı son derece düşüktür. Telafi (refill) garantisi yalnızca garantili paketlerde geçerlidir; kapsam ve süre paket detayında belirtilir, garanti süresi içinde düşen miktar ücretsiz tamamlanır.",
  },
  {
    q: "Beğeni almak keşfet sıralamasını etkiler mi?",
    a: "Instagram algoritması yüksek etkileşimli içerikleri keşfet bölümünde öne çıkarır. Beğeni artışı, içeriğinizin daha geniş kitlelere ulaşmasını doğrudan destekler.",
  },
];

const features = [
  {
    icon: Zap,
    title: "Anlık Başlangıç",
    desc: "Sipariş onayından saniyeler sonra beğeniler gelmeye başlar.",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Şifresiz İşlem",
    desc: "Sadece gönderi linkiniz yeterli. Hesap şifresi asla istemiyoruz.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    icon: Globe,
    title: "Türk + Dünya Beğeni",
    desc: "Hedef kitlenize göre Türk veya uluslararası beğeni paketi seçin.",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  {
    icon: HeartHandshake,
    title: "Garantili Paketler",
    desc: "Garantili paketlerde düşme ücretsiz tamamlanır.",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
  },
  {
    icon: TrendingUp,
    title: "Keşfet Desteği",
    desc: "Yüksek etkileşim, algoritmanın içeriğinizi öne çıkarmasını sağlar.",
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
  { n: "01", title: "Gönderi Linkini Kopyala", desc: "Beğeni almak istediğiniz Instagram gönderisinin linkini kopyalayın." },
  { n: "02", title: "Paket Seçin", desc: "İhtiyacınıza ve bütçenize uygun beğeni paketini seçin." },
  { n: "03", title: "Ödeme Yapın", desc: "Kredi kartı, banka kartı veya bakiyenizle güvenli ödeme." },
  { n: "04", title: "Beğeniler Gelsin", desc: "Siparişiniz işleme alınır ve dakikalar içinde beğeniler hesabınıza yansır." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Instagram Beğeni Satın Al",
  description: "OptiSMM üzerinden güvenli ve hızlı Instagram beğeni satın alın. Türk ve dünya beğenisi, anlık teslimat.",
  provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl },
  areaServed: "TR",
  url: `${siteUrl}/instagram-begeni-satin-al`,
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

export default function InstagramBegeniPage() {
  return (
    <>
      <Script id="insta-begeni-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="insta-begeni-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>

      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">

          {/* Hero */}
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(236,72,153,0.25),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-pink-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                  <Heart size={22} className="text-white" fill="white" />
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">
                  Instagram Beğeni
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                Instagram Beğeni Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 mt-1">
                  Anlık, Gerçek ve Ucuz
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                Gönderilerinizi öne çıkarmak mı istiyorsunuz? OptiSMM ile Türk ve dünya beğenisi
                arasından seçim yapın; anlık teslimat, güvenli ödeme ve 7/24 destek güvencesiyle
                keşfet sıralamanızı bugünden yükseltin.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-pink-500/30 hover:opacity-90 transition-all">
                  Beğeni Paketleri <ArrowRight size={18} />
                </Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">
                  Ücretsiz Kayıt Ol
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Anlık teslimat", "Şifre gerekmez", "Garantili seçenekler", "3D Secure ödeme"].map((t) => (
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
              <h2 className="text-3xl font-bold font-display">Beğeni Almada Farkımız</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Binlerce içerik üreticisinin güvendiği OptiSMM, hız ve kaliteyi bir arada sunar.
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
              <h2 className="text-3xl font-bold font-display">4 Adımda Instagram Beğeni</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">Instagram Beğeni Neden Bu Kadar Önemli?</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>
                Instagram algoritması, beğeni sayısı yüksek içerikleri keşfet bölümünde ve önerilen
                gönderiler arasında <strong className="text-foreground">öncelikli olarak gösterir</strong>. Bu durum,
                organik büyümenin motoru olan keşfet görünürlüğünüzü doğrudan artırır. Bir gönderi ne
                kadar çok beğeni alırsa o kadar fazla gerçek kullanıcıya ulaşır; bu da zincirleme bir
                büyüme döngüsü yaratır.
              </p>
              <p>
                Kişisel markalar ve işletmeler için beğeni sayısı aynı zamanda <strong className="text-foreground">sosyal kanıt</strong>tır.
                Profil ziyaretçisi binlerce beğeni gören bir gönderiyle karşılaştığında hesabı aktif
                ve güvenilir olarak değerlendirir. Bu güven algısı, takipçi dönüşümünü ve satış
                kararlarını doğrudan etkiler.
              </p>
              <p>
                Influencer marketing ekosisteminde markaların hesap değerlendirmesi yaparken
                bakacağı ilk metriklerden biri gönderi başına <strong className="text-foreground">ortalama etkileşim oranı</strong>dır.
                OptiSMM ile satın aldığınız beğeniler bu oranı iyileştirerek sponsorluk tekliflerini
                ve iş birliği fırsatlarını artırır.
              </p>
              <p>
                OptiSMM'un Instagram beğeni hizmeti, <strong className="text-foreground">Türk ve uluslararası</strong> seçenekleriyle
                her tür hesabın ihtiyacına cevap verir. Yerel bir işletmeyseniz Türk beğeni paketiyle
                Türkiye keşfetinde öne çıkın; global bir içerik üreticisiyseniz dünya beğeni
                paketiyle uluslararası görünürlüğünüzü güçlendirin.
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
          <div className="rounded-[2.5rem] border border-pink-500/30 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.2),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-pink-500/10">
            <BadgeCheck size={40} className="text-pink-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Gönderilerini Keşfete Taşı</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">
              OptiSMM'a ücretsiz kayıt ol, beğeni paketini seç ve ilk beğenilerin dakikalar içinde geldiğini gör.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-pink-500/30 hover:opacity-90 transition-all text-base">
                Beğeni Paketlerini İncele <ArrowRight size={20} />
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
