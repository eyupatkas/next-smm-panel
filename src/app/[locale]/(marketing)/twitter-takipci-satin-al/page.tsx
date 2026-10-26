import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import { AtSign, ShieldCheck, Zap, TrendingUp, Star, CheckCircle2, ArrowRight, Clock, Globe, BadgeCheck, Users, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "Twitter Takipçi Satın Al — X Takipçi | OptiSMM",
  description: "Twitter (X) takipçi satın al! Gerçek görünümlü profiller, anlık teslimat, garantili paket seçenekleri. X hesabınızı büyütmek için OptiSMM Twitter takipçi paketleri.",
  keywords: "twitter takipçi satın al, x takipçi satın al, twitter takipçi artırma, ucuz twitter takipçi, türk twitter takipçi, x hesap büyütme",
  alternates: { canonical: `${siteUrl}/twitter-takipci-satin-al`, languages: hreflangAlternates("/twitter-takipci-satin-al") },
  openGraph: { title: "Twitter Takipçi Satın Al (X) | OptiSMM", description: "Twitter/X hesabınız için güvenli takipçi paketleri. Anlık teslimat.", type: "website", url: `${siteUrl}/twitter-takipci-satin-al`, siteName: "OptiSMM" },
};

const faqItems = [
  { q: "Twitter yeni adıyla X'te takipçi almak güvenli mi?", a: "OptiSMM gerçek görünümlü profil kalitesinde hesaplardan takipçi sağlar. Spam filtreleri tetiklemeyecek doğal büyüme hızları kullanıyoruz." },
  { q: "Türkçe (Türk) Twitter takipçi alabilir miyim?", a: "Evet. Türkçe tweet geçmişi olan ve Türk IP'lerinden aktif görünen profil seçenekleri mevcuttur. Sipariş sırasında Türk takipçi filtresini seçebilirsiniz." },
  { q: "Takipçiler ne kadar sürede geliyor?", a: "Standart paketlerde 10–60 dakika; büyük paketlerde 24–48 saat içinde kademeli olarak takipçi eklenir." },
  { q: "X (Twitter) hesabım kilitlenir mi?", a: "OptiSMM'ın dağıtım hızları platform eşiklerini aşmayacak şekilde ayarlanmıştır. Hesabınıza erişim bilgisi paylaşmadan sadece kullanıcı adıyla sipariş verebilirsiniz." },
  { q: "Garanti süresi ne kadar?", a: "Telafi (refill) garantisi garantili paketlerde geçerlidir; bu paketlerde teslimattan itibaren 30 gün içindeki düşüşler ücretsiz yenilenir." },
];

const features = [
  { icon: Users, title: "Türk + Uluslararası Seçeneği", desc: "Türkçe profillerden veya global seçenekte takipçi alın.", color: "text-sky-400", bg: "bg-sky-500/15" },
  { icon: Zap, title: "Anlık Teslimat", desc: "Sipariş onayından kısa süre sonra takipçiler gelmeye başlar.", color: "text-blue-400", bg: "bg-blue-500/15" },
  { icon: TrendingUp, title: "Kademeli Büyüme", desc: "Doğal görünümlü büyüme hızıyla algoritma güveni artar.", color: "text-indigo-400", bg: "bg-indigo-500/15" },
  { icon: ShieldCheck, title: "Garantili Paketler", desc: "Garantili paketlerde 30 gün içinde düşüş ücretsiz yenilenir.", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { icon: BarChart2, title: "Kredibilite Artışı", desc: "Yüksek takipçi sayısı kaynağa güveni artırır.", color: "text-cyan-400", bg: "bg-cyan-500/15" },
  { icon: Globe, title: "Şifresiz İşlem", desc: "Sadece X kullanıcı adınızla güvenli sipariş.", color: "text-violet-400", bg: "bg-violet-500/15" },
];

const steps = [
  { n: "01", title: "X Kullanıcı Adını Gir", desc: "Twitter/X hesabınızın @ ile başlayan kullanıcı adını girin." },
  { n: "02", title: "Paket Seçin", desc: "Küçük başlangıçtan büyük hedeflere uygun paket belirleyin." },
  { n: "03", title: "Ödeme Yapın", desc: "Güvenli ödeme altyapısıyla işlemi tamamlayın." },
  { n: "04", title: "Takipçiler Gelsin", desc: "Kademeli ve doğal görünümlü takipçi artışı başlar." },
];

const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: "Twitter Takipçi Satın Al", description: "OptiSMM üzerinden Twitter/X hesabınıza hızlı ve güvenli takipçi kazanın.", provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl }, areaServed: "TR", url: `${siteUrl}/twitter-takipci-satin-al` };
const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function TwitterTakipciPage() {
  return (
    <>
      <Script id="tw-takipci-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="tw-takipci-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(14,165,233,0.22),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-sky-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg"><AtSign size={22} className="text-white" /></div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">Twitter / X</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                Twitter Takipçi Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-400 mt-1">X Hesabını Güçlendir, Kredibilite Kazan</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                Twitter (yeni adıyla X) hesabınızı büyütmek için en hızlı yol. OptiSMM ile Türkçe veya global Twitter takipçi satın alın; hesabınızın güvenilirliğini artırın ve daha geniş kitlelere ulaşın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/twitter" className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-sky-500/30 hover:opacity-90 transition-all">Twitter Paketleri <ArrowRight size={18} /></Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">Ücretsiz Kayıt Ol</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Türk takipçi seçeneği", "Şifresiz işlem", "Anlık başlar", "Garantili seçenekler"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> {t}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Avantajlar</p>
              <h2 className="text-3xl font-bold font-display">Twitter/X Takipçide Farkımız</h2>
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
              <h2 className="text-3xl font-bold font-display">4 Adımda Twitter Takipçi Al</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">Twitter/X&apos;te Takipçi Sayısı Neden Önemli?</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>Twitter'ın X olarak yeniden markalanmasından bu yana platform, <strong className="text-foreground">içerik üreticileri ve markalar için</strong> en stratejik sosyal mecra olmaya devam ediyor. Düşünce liderleri, gazete editörleri ve yatırımcılar gibi karar vericilerin aktif kullandığı bu platformda <strong className="text-foreground">takipçi sayısı dolaylı bir otorite sinyali</strong> işlevi görür.</p>
              <p>Az takipçiyle başlayan hesaplar sosyal kanıt eksikliği nedeniyle organik büyümede ciddi zorluklarla karşılaşır. OptiSMM ile Twitter takipçi satın almak bu <strong className="text-foreground">başlangıç ivmesini</strong> yaratarak organik büyümenin önünü açar.</p>
              <p>Özellikle PR, halkla ilişkiler, medya ve kamu yaşamında aktif olan kişiler için <strong className="text-foreground">yüksek takipçi sayısı güven ve itibar göstergesidir</strong>. Kurumsal hesabınız veya kişisel markanız için doğru başlangıç kitlesini oluşturabilirsiniz.</p>
              <p>OptiSMM'ın Twitter paketleri <strong className="text-foreground">Türkçe veya uluslararası profil seçeneğiyle</strong> hedef kitlenize uygun büyüme sağlar. Garantili paketlerde 30 günlük Refill garantisi ile yatırımınız korunur.</p>
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

          <div className="rounded-[2.5rem] border border-sky-500/30 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.18),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-sky-500/10">
            <BadgeCheck size={40} className="text-sky-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">X Hesabını Büyüt</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">OptiSMM'a ücretsiz kayıt ol, Twitter/X takipçi paketini seç ve hesabının kredibilitesini hızla yükselt.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/twitter" className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-sky-500/30 hover:opacity-90 transition-all text-base">Twitter Paketlerini İncele <ArrowRight size={20} /></Link>
              <Link href="/contact" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"><Clock size={16} /> 7/24 Destek</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
