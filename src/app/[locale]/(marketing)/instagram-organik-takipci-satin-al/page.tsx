import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import { Leaf, ShieldCheck, Zap, TrendingUp, Star, CheckCircle2, ArrowRight, Clock, Users, BadgeCheck, Sprout, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "Instagram Organik Takipçi Satın Al — Gerçek Büyüme | OptiSMM",
  description: "Instagram organik takipçi satın al! İlgi alanına uygun gerçek görünümlü profiller, doğal büyüme hızı, garantili paket seçenekleri. OptiSMM organik Instagram büyüme paketleri.",
  keywords: "instagram organik takipçi satın al, organik instagram büyüme, gerçek instagram takipçi, kaliteli instagram takipçi, hedefli takipçi instagram",
  alternates: { canonical: `${siteUrl}/instagram-organik-takipci-satin-al`, languages: hreflangAlternates("/instagram-organik-takipci-satin-al") },
  openGraph: { title: "Instagram Organik Takipçi Satın Al | OptiSMM", description: "Organik görünümlü, gerçek profil kalitesinde Instagram takipçisi.", type: "website", url: `${siteUrl}/instagram-organik-takipci-satin-al`, siteName: "OptiSMM" },
};

const faqItems = [
  { q: "Organik takipçi ile normal takipçi arasındaki fark nedir?", a: "Organik takipçi paketleri, hedef kitlenizle uyumlu ilgi alanlarına sahip profil kalitesinde hesaplardan oluşur. Bu takipçiler daha gerçekçi görünür ve etkileşim oranlarınıza daha az zarar verir." },
  { q: "Takipçiler gerçekten etkileşim yapar mı?", a: "OptiSMM'ın organik paketi etkileşim garantisi vermez; ancak profil kalitesi standart paketlerden yüksek olduğundan doğal görünüm daha iyidir. Aktif etkileşim için ayrıca etkileşim paketleri mevcuttur." },
  { q: "Organik takipçi hesabımın etkileşim oranını düşürür mü?", a: "Yüksek kaliteli profil standartlarımız nedeniyle organik paketimiz düşük kaliteli alternatiflere kıyasla etkileşim oranını çok daha az etkiler." },
  { q: "Bu paketi hangi hesap türleri için önerirsiniz?", a: "İçerik üreticiler, markalar, influencer'lar ve kalite algısının önemli olduğu her hesap için öneririz. Özellikle marka iş birliği hedefleyenler için organik takipçi kritiktir." },
  { q: "Kaç takipçiyle başlamak mantıklı?", a: "Başlangıç için 1.000–5.000 organik takipçi güçlü bir sosyal kanıt temeli oluşturur. Uzun vadeli büyüme için kademeli paketler daha sürdürülebilir bir profil görünümü sunar." },
];

const features = [
  { icon: Leaf, title: "Organik Görünümlü Profiller", desc: "İlgi alanlarına göre seçilmiş yüksek kaliteli takipçi profilleri.", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { icon: Sprout, title: "Doğal Büyüme Hızı", desc: "Günlük ekleme sınırlarıyla tamamen doğal büyüme eğrisi.", color: "text-green-400", bg: "bg-green-500/15" },
  { icon: TrendingUp, title: "Etkileşim Oranı Koruması", desc: "Yüksek profil kalitesiyle etkileşim oranınızı koruyun.", color: "text-lime-400", bg: "bg-lime-500/15" },
  { icon: ShieldCheck, title: "Garantili Paketler", desc: "Garantili paketlerde takipçi düşüşü ücretsiz yenilenir.", color: "text-teal-400", bg: "bg-teal-500/15" },
  { icon: Users, title: "Marka Uyumlu", desc: "Nişinizle eşleşen profil ilgi alanlarıyla segmentasyon.", color: "text-cyan-400", bg: "bg-cyan-500/15" },
  { icon: Globe, title: "Şifresiz İşlem", desc: "Sadece kullanıcı adınızla güvenli sipariş verme.", color: "text-blue-400", bg: "bg-blue-500/15" },
];

const steps = [
  { n: "01", title: "Kullanıcı Adını Gir", desc: "Instagram hesabınızın kullanıcı adını yazın; şifre gerekmez." },
  { n: "02", title: "Organik Paketi Seç", desc: "Hedeflerinize uygun takipçi miktarı ve profil kalitesi seçin." },
  { n: "03", title: "Ödeme Yapın", desc: "Güvenli ödeme altyapısıyla işlemi tamamlayın." },
  { n: "04", title: "Doğal Büyüme Başlasın", desc: "Günlük kademeli eklemeyle organik görünümlü büyüme başlar." },
];

const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: "Instagram Organik Takipçi Satın Al", description: "OptiSMM üzerinden Instagram hesabınıza organik görünümlü gerçek kalitede takipçi kazanın.", provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl }, areaServed: "TR", url: `${siteUrl}/instagram-organik-takipci-satin-al` };
const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function InstagramOrganikTakipciPage() {
  return (
    <>
      <Script id="insta-organik-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="insta-organik-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(34,197,94,0.22),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-green-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg"><Leaf size={22} className="text-white" /></div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">Instagram Organik</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                Instagram Organik Takipçi Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400 mt-1">Kalite Odaklı, Gerçek Görünümlü Büyüme</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                Ucuz bot yerine organik görünümlü kaliteli takipçi mi arıyorsunuz? OptiSMM'ın Instagram organik takipçi paketleri yüksek profil kaliteli hesaplardan oluşur; etkileşim oranınızı korurken sayınızı büyütür.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-green-500/30 hover:opacity-90 transition-all">Organik Paketler <ArrowRight size={18} /></Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">Ücretsiz Kayıt Ol</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Yüksek profil kalitesi", "Doğal hız", "Etkileşim koruması", "Garantili seçenekler"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> {t}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Neden Organik?</p>
              <h2 className="text-3xl font-bold font-display">Kalite ile Büyümenin Farkı</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card key={f.title} className="border-white/10 bg-gradient-to-br from-card to-card/60 shadow-xl hover:border-white/20 transition-all hover:-translate-y-0.5">
                  <CardContent className="p-6">
                    <div className={`w-11 h-11 rounded-2xl ${f.bg} flex items-center justify-center mb-4`}><f.icon size={22} className={f.color} /></div>
                    <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-6">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-card to-card/70 p-8 md:p-12">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Nasıl Çalışır?</p>
              <h2 className="text-3xl font-bold font-display">4 Adımda Organik Takipçi Al</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              {steps.map((s) => (
                <div key={s.n}>
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4"><span className="text-lg font-black text-primary">{s.n}</span></div>
                  <h3 className="font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-6">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold font-display mb-6">Organik Takipçi ve Instagram Algoritması</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>Instagram'ın 2024 algoritma güncellemeleri <strong className="text-foreground">etkileşim oranı (engagement rate)</strong> metriğini daha güçlü vurgulamaktadır. Düşük kaliteli takipçi kitlesi etkileşim oranınızı düşürür ve organik dağıtımınızı olumsuz etkiler.</p>
              <p>OptiSMM'ın organik takipçi paketi yüksek profil kalitesine sahip hesaplardan oluştuğundan <strong className="text-foreground">etkileşim oranınıza minimum etki</strong> yapar. Bu sayede hem takipçi sayınız büyür hem de algoritmanızın gücü korunur.</p>
              <p>Özellikle <strong className="text-foreground">marka iş birliği arayan içerik üreticiler ve reklamverenler</strong> için "sahte" görünen büyük rakamlardan çok organik görünümlü kaliteli kitle daha değerlidir. PR ajansları ve marka yöneticileri profil analizlerinde takipisiz etkileşim oranını kontrol eder.</p>
              <p>OptiSMM olarak <strong className="text-foreground">kademeli ekleme sistemiyle</strong> takipçilerinizi doğal bir büyüme eğrisinde teslim ediyoruz. Garantili paketlerde 30 günlük Refill garantisi de dahildir.</p>
            </div>
          </div>

          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Sık Sorulan Sorular</p>
              <h2 className="text-3xl font-bold font-display">Merak Ettikleriniz</h2>
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              {faqItems.map(({ q, a }) => (
                <details key={q} className="group rounded-2xl border border-white/10 bg-card/60 hover:border-white/20 transition-all">
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-sm select-none list-none"><span>{q}</span><Star size={14} className="shrink-0 text-primary/60 group-open:text-primary transition-colors" /></summary>
                  <p className="px-6 pb-5 text-sm text-muted-foreground leading-7">{a}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-green-500/30 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.18),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-green-500/10">
            <BadgeCheck size={40} className="text-green-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Kaliteli Büyümeye Başla</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">OptiSMM'a ücretsiz kayıt ol, organik takipçi paketini seç ve Instagram hesabını gerçek büyüme gücüyle besle.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-green-500/30 hover:opacity-90 transition-all text-base">Organik Paketleri İncele <ArrowRight size={20} /></Link>
              <Link href="/contact" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"><Clock size={16} /> 7/24 Destek</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
