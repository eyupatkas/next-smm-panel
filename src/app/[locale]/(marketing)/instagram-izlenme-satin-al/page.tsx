import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import { Eye, ShieldCheck, Zap, TrendingUp, Star, CheckCircle2, ArrowRight, Clock, HeartHandshake, BadgeCheck, Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "Instagram İzlenme Satın Al — Video & Reels İzlenme | OptiSMM",
  description: "Instagram video izlenme satın al! Reels ve normal videolarınız için anlık izlenme artışı. Şifresiz işlem, garantili seçenekler, 7/24 destek. OptiSMM ile keşfete düşün.",
  keywords: "instagram izlenme satın al, instagram video izlenme, instagram reels izlenme satın al, ucuz instagram izlenme, gerçek instagram izlenme",
  alternates: { canonical: `${siteUrl}/instagram-izlenme-satin-al`, languages: hreflangAlternates("/instagram-izlenme-satin-al") },
  openGraph: { title: "Instagram İzlenme Satın Al | OptiSMM", description: "Videolarınıza anında izlenme kazandırın. Keşfet algoritmasını destekleyin.", type: "website", url: `${siteUrl}/instagram-izlenme-satin-al`, siteName: "OptiSMM" },
};

const faqItems = [
  { q: "Instagram izlenme satın almak güvenli mi?", a: "OptiSMM olarak gerçek görünümlü profillerden izlenme gönderiyoruz. Hesabınıza zarar verebilecek bot tabanlı yöntemler kullanmıyoruz. Şifrenizi asla istemiyoruz." },
  { q: "Reels ve normal video için ayrı paket mi almalıyım?", a: "OptiSMM'ta hem Reels hem de normal video izlenme paketleri mevcuttur. Sipariş sırasında video linkini girerken hangi tür olduğu otomatik algılanır." },
  { q: "İzlenmeler ne zaman gelir?", a: "Sipariş onayından sonra 0–10 dakika içinde izlenmeler gelmeye başlar. Büyük paketlerde drip-feed yöntemiyle organik akış sağlanır." },
  { q: "İzlenme almak keşfet sıralamasını etkiler mi?", a: "Evet. Instagram algoritması yüksek izlenme alan videoları Keşfet ve Reels sayfasında öne çıkarır. İzlenme artışı bu organik görünürlük sinyalini güçlendirir." },
  { q: "İzlenmeler düşerse ne olur?", a: "Kaliteli paketlerimizde düşme son derece seyrektir. Telafi (refill) garantisi yalnızca garantili paketlerde geçerlidir; kapsam ve süre paket detayında belirtilir, garanti süresi içinde düşen miktar ücretsiz tamamlanır." },
];

const features = [
  { icon: Zap, title: "Anlık Başlangıç", desc: "Siparişten dakikalar sonra izlenmeler gelmeye başlar.", color: "text-amber-400", bg: "bg-amber-500/15" },
  { icon: ShieldCheck, title: "Şifresiz İşlem", desc: "Sadece video linki yeterli. Hesap şifresi gerekmez.", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { icon: Globe, title: "Reels + Video Desteği", desc: "Normal video ve Reels için ayrı paket seçenekleri.", color: "text-blue-400", bg: "bg-blue-500/15" },
  { icon: HeartHandshake, title: "Garantili Paketler", desc: "Garantili paketlerde düşme ücretsiz tamamlanır.", color: "text-pink-400", bg: "bg-pink-500/15" },
  { icon: TrendingUp, title: "Keşfet Desteği", desc: "Yüksek izlenme, videolarınızın keşfete çıkma şansını artırır.", color: "text-violet-400", bg: "bg-violet-500/15" },
  { icon: Lock, title: "Güvenli Ödeme", desc: "PayTR 3D Secure altyapısıyla güvenli ödeme.", color: "text-cyan-400", bg: "bg-cyan-500/15" },
];

const steps = [
  { n: "01", title: "Video Linkini Kopyala", desc: "İzlenme almak istediğiniz Instagram videosu veya Reels linkini kopyalayın." },
  { n: "02", title: "Paket Seçin", desc: "Bütçenize ve hedeflerinize uygun izlenme paketini belirleyin." },
  { n: "03", title: "Ödeme Yapın", desc: "Kredi kartı, banka kartı veya mevcut bakiyeyle ödeme." },
  { n: "04", title: "İzlenmeler Gelsin", desc: "Dakikalar içinde izlenmeler videonuza yansır." },
];

const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: "Instagram İzlenme Satın Al", description: "OptiSMM üzerinden hızlı Instagram video ve Reels izlenme satın alın.", provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl }, areaServed: "TR", url: `${siteUrl}/instagram-izlenme-satin-al` };
const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function InstagramIzlenmePage() {
  return (
    <>
      <Script id="insta-izlenme-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="insta-izlenme-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(168,85,247,0.25),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-purple-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
                  <Eye size={22} className="text-white" />
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">Instagram İzlenme</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                Instagram İzlenme Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-400 mt-1">Reels ve Video İçin Anlık Artış</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                Instagram Reels ve video içeriklerinizin izlenme sayısını artırmak mı istiyorsunuz? OptiSMM ile anlık izlenme kazanın; keşfet
                algoritmalarına güçlü bir sinyal gönderin ve içeriklerinizin organik erişimini katlayın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-purple-500/30 hover:opacity-90 transition-all">İzlenme Paketleri <ArrowRight size={18} /></Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">Ücretsiz Kayıt Ol</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Anlık teslimat", "Reels + Video", "Keşfet desteği", "Garantili seçenekler"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> {t}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Neden OptiSMM?</p>
              <h2 className="text-3xl font-bold font-display">İzlenme Almada Farkımız</h2>
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
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Süreç</p>
              <h2 className="text-3xl font-bold font-display">4 Adımda Instagram İzlenme</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">Instagram İzlenme Artırmanın Önemi</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>Instagram Reels algoritması, yüklendikten sonraki ilk birkaç saatte yüksek izlenme alan videoları <strong className="text-foreground">keşfet ve Reels sekmesinde öncelikli olarak gösterir</strong>. Bu kritik ilk pencereyi kazanmak, organik büyümenin en güçlü katalizörüdür.</p>
              <p>Marka iş birliklerinde ajanslar ve pazarlama ekipleri içerik üreticilerini değerlendirirken <strong className="text-foreground">video başına ortalama izlenme sayısına</strong> bakılır. Yüksek izlenme ortalaması, influencer tekliflerini ve sponsorluk gelirlerini doğrudan etkiler.</p>
              <p>Instagram'da 10.000 izlenme eşiğini aşan Reels içerikleri, platform genelinde <strong className="text-foreground">önerilen videolar listesine</strong> girme şansı elde eder. Bu organik keşfedilebilirlik, takipçi büyümesini de beraberinde getirir.</p>
              <p>OptiSMM'ın Instagram izlenme hizmeti, Reels ve normal video için <strong className="text-foreground">ayrı optimize edilmiş paketler</strong> sunar. Türk ve dünya izlenme seçenekleriyle hedef kitlenize en uygun büyüme stratejisini belirleyin.</p>
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

          <div className="rounded-[2.5rem] border border-purple-500/30 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.2),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-purple-500/10">
            <BadgeCheck size={40} className="text-purple-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">İçeriklerini Keşfete Taşı</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">OptiSMM'a ücretsiz kayıt ol, izlenme paketini seç ve videolarının erişimini bugünden artır.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-purple-500/30 hover:opacity-90 transition-all text-base">İzlenme Paketlerini İncele <ArrowRight size={20} /></Link>
              <Link href="/contact" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"><Clock size={16} /> 7/24 Destek</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
