import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import { Eye, ShieldCheck, Zap, TrendingUp, Star, CheckCircle2, ArrowRight, Clock, BarChart2, BadgeCheck, Music2, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "TikTok İzlenme Satın Al — For You'ya Çık | OptiSMM",
  description: "TikTok izlenme satın al! Videolarınızın For You (FYP) oranını artırın. Hızlı teslimat, güvenli ödeme, garantili seçenekler. OptiSMM TikTok izlenme paketleri.",
  keywords: "tiktok izlenme satın al, tiktok video izlenme, ucuz tiktok izlenme, tiktok fyp, tiktok izlenme artırma, tiktok for you",
  alternates: { canonical: `${siteUrl}/tiktok-izlenme-satin-al`, languages: hreflangAlternates("/tiktok-izlenme-satin-al") },
  openGraph: { title: "TikTok İzlenme Satın Al | OptiSMM", description: "TikTok videolarınız For You'ya çıksın. Hızlı TikTok izlenme.", type: "website", url: `${siteUrl}/tiktok-izlenme-satin-al`, siteName: "OptiSMM" },
};

const faqItems = [
  { q: "TikTok izlenme almak hesabım için güvenli mi?", a: "OptiSMM'ın doğal hız profilleri TikTok'un spam filtrelerini tetiklemez. Hesabınız şifresiz, güvenli bir şekilde izlenme kazanır." },
  { q: "TikTok izlenme For You sayfasını etkiler mi?", a: "Evet. TikTok algoritması izlenme tamamlama oranını ve toplam izlenme miktarını FYP dağıtımında temel sinyal olarak kullanır. Yüksek izlenme, daha geniş organik dağıtımı tetikler." },
  { q: "İzlenmeler ne kadar sürede geliyor?", a: "Siparişiniz onaylandıktan sonra 10–60 dakika içinde izlenmeler artmaya başlar. Büyük paketlerde 24 saat içinde tamamlanır." },
  { q: "500 bin TikTok izlenme için fiyat nasıl?", a: "Fiyatlandırmamız toplu sipariş indirim sistemine sahiptir; büyük paketlerde izlenme başına maliyet düşer. Güncel fiyatlar için TikTok kategori sayfamızı inceleyin." },
  { q: "Canlı yayın veya fotoğraf için de izlenme var mı?", a: "OptiSMM'ta video izlenme paketinin yanı sıra TikTok LIVE izlenme ve profil görüntüleme paketleri de mevcuttur." },
];

const features = [
  { icon: Eye, title: "For You (FYP) Desteği", desc: "Yüksek izlenme miktarı FYP dağıtımını genişletir.", color: "text-cyan-400", bg: "bg-cyan-500/15" },
  { icon: Music2, title: "Her İçerik Türüne Uygun", desc: "Müzik, eğlence, eğitim — tüm TikTok içerikleri için.", color: "text-sky-400", bg: "bg-sky-500/15" },
  { icon: Zap, title: "Hızlı Teslimat", desc: "Sipariş sonrası 10–60 dakikada başlar.", color: "text-yellow-400", bg: "bg-yellow-500/15" },
  { icon: BarChart2, title: "Algoritma Güçlendirici", desc: "İzlenme oranı verisi TikTok'un yayılım kararını etkiler.", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { icon: ShieldCheck, title: "Garantili Paketler", desc: "Garantili paketlerde 30 gün içinde düşüş ücretsiz yenilenir.", color: "text-violet-400", bg: "bg-violet-500/15" },
  { icon: Globe, title: "Geniş Kaynak Ağı", desc: "Uluslararası IP ağından gerçekçi izlenme dağılımı.", color: "text-orange-400", bg: "bg-orange-500/15" },
];

const steps = [
  { n: "01", title: "Video Linkini Kopyala", desc: "İzlenme almak istediğiniz TikTok videosunun paylaşım linkini kopyalayın." },
  { n: "02", title: "Paket Seçin", desc: "1.000'den 1.000.000'e kadar geniş yelpazeden uygun paketi seçin." },
  { n: "03", title: "Güvenli Ödeme", desc: "3D Secure altyapısıyla kartla veya mevcut bakiyeyle ödeme yapın." },
  { n: "04", title: "İzlenmeler Yükselsin", desc: "Siparişiniz işleme alınır; izlenme artarken FYP şansınız büyür." },
];

const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: "TikTok İzlenme Satın Al", description: "OptiSMM üzerinden TikTok videolarınıza hızlı ve güvenli izlenme ekleyin.", provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl }, areaServed: "TR", url: `${siteUrl}/tiktok-izlenme-satin-al` };
const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function TiktokIzlenmePage() {
  return (
    <>
      <Script id="tt-izlenme-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="tt-izlenme-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.22),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-cyan-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center shadow-lg"><Eye size={22} className="text-white" /></div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">TikTok İzlenme</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                TikTok İzlenme Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400 mt-1">Videolarını For You'ya Taşı</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                TikTok videolarınızın For You sayfasına çıkması izlenme oranıyla doğrudan bağlantılıdır. OptiSMM ile güvenli TikTok izlenme paketleri satın alın, algoritmanızı çalıştırın ve viral potansiyelinizi ortaya çıkarın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/tiktok" className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-sky-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-cyan-500/30 hover:opacity-90 transition-all">TikTok İzlenme Paketleri <ArrowRight size={18} /></Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">Ücretsiz Kayıt Ol</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["FYP desteği", "Şifresiz işlem", "Anlık başlar", "Garantili seçenekler"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> {t}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Neden OptiSMM?</p>
              <h2 className="text-3xl font-bold font-display">TikTok İzlenmede Farkımız</h2>
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
              <h2 className="text-3xl font-bold font-display">4 Adımda TikTok İzlenme Al</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">TikTok İzlenme ve Algoritma İlişkisi</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>TikTok'un algoritması her videoyu küçük bir "test kitlesine" göstererek başlar. Bu kitlede elde edilen <strong className="text-foreground">izlenme tamamlanma oranı</strong> (watch time %), beğeni/yorum oranı ve paylaşım sayısı bir sonraki yayılım kararını belirler.</p>
              <p>Videolarınız bu ilk eşiği geçemezse sadece takipçilerinize ulaşır; geçebilirse FYP'de milyonlarca insana gösterilme şansı yakalanır. OptiSMM'ın <strong className="text-foreground">TikTok izlenme paketleri</strong> bu kritik eşiği aşmanıza yardımcı olur.</p>
              <p>Özellikle yeni hesaplar veya viral potansiyeli yüksek videolar için izlenme paketi bir <strong className="text-foreground">büyüme katalizörü</strong> işlevi görür. İlk 1.000–5.000 izlenmeyi organik kazanmak yerel kitlenizi aşmak için çoğu zaman yetersiz kalır.</p>
              <p>Garantili izlenme paketlerinde Refill garantisi yatırımınızı korur. <strong className="text-foreground">30 gün içinde herhangi bir düşüş</strong> yaşarsanız paketiniz ücretsiz yenilenir; böylece sürdürülebilir bir büyüme temeli oluşturursunuz.</p>
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

          <div className="rounded-[2.5rem] border border-cyan-500/30 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.18),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-cyan-500/10">
            <BadgeCheck size={40} className="text-cyan-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Videolarını For You'ya Taşı</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">OptiSMM'a ücretsiz kayıt ol, TikTok izlenme paketini seç ve videolarının viral yolculuğunu başlat.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/tiktok" className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-sky-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-cyan-500/30 hover:opacity-90 transition-all text-base">TikTok İzlenme Paketleri <ArrowRight size={20} /></Link>
              <Link href="/contact" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"><Clock size={16} /> 7/24 Destek</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
