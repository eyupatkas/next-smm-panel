import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import { Play, ShieldCheck, Zap, TrendingUp, Star, CheckCircle2, ArrowRight, Clock, BarChart2, BadgeCheck, Eye, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "Instagram Reels İzlenme Satın Al — Keşfete Çık | OptiSMM",
  description: "Instagram Reels izlenme satın al! Videolarınızın algoritma puanını yükseltin, Keşfet sayfasına çıkın. Anlık başlayan gerçek Reels izlenme — OptiSMM.",
  keywords: "instagram reels izlenme satın al, reels izlenme artırma, instagram reels kesfet, ucuz reels izlenme, instagram video izlenme satın al",
  alternates: { canonical: `${siteUrl}/instagram-reels-izlenme-satin-al`, languages: hreflangAlternates("/instagram-reels-izlenme-satin-al") },
  openGraph: { title: "Instagram Reels İzlenme Satın Al | OptiSMM", description: "Reels videolarınız Keşfete çıksın. Anlık izlenme artışı.", type: "website", url: `${siteUrl}/instagram-reels-izlenme-satin-al`, siteName: "OptiSMM" },
};

const faqItems = [
  { q: "Reels izlenme almak hesabıma zarar verir mi?", a: "Doğal görünümlü dağıtım hızımız sayesinde OptiSMM, hesabınızı riske atmaz. Anlık değil, aşamalı teslimat yaparak platformun algoritmik eşiklerini güvenli geçersiniz." },
  { q: "Yalnızca Reels mi yoksa normal videolar da kapsanıyor mu?", a: "OptiSMM'ta yalnızca Reels formatı için optimize edilmiş izlenme paketleri mevcuttur. Normal (Feed) video veya Story izlenme için ayrı paketler sunuyoruz." },
  { q: "Reels izlenme Keşfet'e çıkmamı garanti eder mi?", a: "Keşfet görünürlüğü yüksek izlenme sayısıyla doğrudan ilişkilidir; ancak algoritmik sonuçlar içerik kalitesine de bağlıdır. OptiSMM izlenme hızlandırıcı sağlar, sonuçları optimize etmenize yardımcı olur." },
  { q: "Birden fazla Reels gönderisine izlenme alabilir miyim?", a: "Evet. Her sipariş için farklı bir Reels linki girerek pek çok gönderinize ayny anda ya da sırayla izlenme paketi uygulayabilirsiniz." },
  { q: "Reels izlenme ile normal izlenme arasında fark var mı?", a: "Evet. Reels izlenme paketleri Reels algoritmasına özgü optimize edilmiş sinyaller içerir; bu da Feed video izlenmeden farklı dağıtım kanalları kullanır." },
];

const features = [
  { icon: Play, title: "Reels'a Özel Paket", desc: "Yalnızca Reels formatına optimize izlenme sinyalleri.", color: "text-orange-400", bg: "bg-orange-500/15" },
  { icon: Eye, title: "Keşfet Desteği", desc: "Yüksek izlenme miktarı Keşfet beslemesini tetikler.", color: "text-amber-400", bg: "bg-amber-500/15" },
  { icon: Zap, title: "Anlık Başlayan Teslimat", desc: "Sipariş onayından sonra hemen izlenme artmaya başlar.", color: "text-yellow-400", bg: "bg-yellow-500/15" },
  { icon: BarChart2, title: "Algoritma Güçlendirici", desc: "Yüksek izlenme oranı organik dağıtımı genişletir.", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { icon: ShieldCheck, title: "Garantili Paketler", desc: "Garantili paketlerde 30 gün içinde düşüş ücretsiz yenilenir.", color: "text-blue-400", bg: "bg-blue-500/15" },
  { icon: Globe, title: "Geniş Kaynak Ağı", desc: "Farklı coğrafyalardan gelen izlenme sinyalleri.", color: "text-violet-400", bg: "bg-violet-500/15" },
];

const steps = [
  { n: "01", title: "Reels Linkini Kopyala", desc: "İzlenme almak istediğiniz Reels videosunun linkini kopyalayın." },
  { n: "02", title: "İzlenme Paketi Seçin", desc: "1.000'den 100.000'e kadar ihtiyacınıza uygun paketi belirleyin." },
  { n: "03", title: "Ödeme Yapın", desc: "Güvenli 3D Secure altyapısıyla ödemeyi tamamlayın." },
  { n: "04", title: "Reels'ınız Yükselsin", desc: "İzlenmeler aşamalı olarak eklenir, algoritmanız güçlenir." },
];

const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: "Instagram Reels İzlenme Satın Al", description: "Reels videolarınız için OptiSMM üzerinden hızlı ve güvenli izlenme artışı.", provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl }, areaServed: "TR", url: `${siteUrl}/instagram-reels-izlenme-satin-al` };
const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function InstagramReelsIzlenmePage() {
  return (
    <>
      <Script id="insta-reels-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="insta-reels-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.22),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-orange-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg"><Play size={22} className="text-white" /></div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">Instagram Reels</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                Instagram Reels İzlenme Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mt-1">Reels Videolarını Keşfete Taşı</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                Instagram Reels algoritması izlenme hızını yakından izler. OptiSMM ile Reels videolarınıza güvenli ve hızlı izlenme ekleyin, Keşfet sayfasında görünürlüğünüzü artırın ve organik büyümenizi hızlandırın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-orange-500/30 hover:opacity-90 transition-all">Reels Paketleri <ArrowRight size={18} /></Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">Ücretsiz Kayıt Ol</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Reels'a özel", "Keşfet desteği", "Anlık başlar", "Garantili seçenekler"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> {t}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Öne Çıkan Avantajlar</p>
              <h2 className="text-3xl font-bold font-display">Neden OptiSMM Reels İzlenme?</h2>
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
              <h2 className="text-3xl font-bold font-display">4 Adımda Reels İzlenme Al</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">Reels İzlenme Neden Bu Kadar Önemli?</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>Instagram, 2020'den itibaren Reels formatını platformun büyüme merkezi haline getirdi. Algoritma yüksek izlenme hızına sahip Reels videolarını önce kendi takipçilerinize, ardından Keşfet akışına yayar. Bu süreçte <strong className="text-foreground">ilk 1–3 saatin izlenme oranı</strong> kritik öneme sahiptir.</p>
              <p>OptiSMM ile Reels videolarınızın ilk saatlerindeki izlenme hızını artırarak bu <strong className="text-foreground">algoritma eşiğini güvenle geçebilirsiniz</strong>. İzlenme sayısı ne kadar yüksekse, organik kitlenize ulaşma şansınız o kadar büyür.</p>
              <p>Özellikle <strong className="text-foreground">yeni bir hesapla ya da yeni bir içerik formatıyla başlıyorsanız</strong>, Reels izlenme paketi büyümenizi hızlandıran en etkili araçlardan biridir. Başlangıçtaki düşük izlenme döngüsünü kırarak büyüme ivmesi yaratabilirsiniz.</p>
              <p>OptiSMM, Reels izlenme paketlerinde doğal görünümlü dağıtım sunar; seçili paketlerde Refill garantisi bulunur. Yani hem <strong className="text-foreground">hesabınız güvende kalır</strong> hem de yatırımınız korunmaktadır.</p>
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

          <div className="rounded-[2.5rem] border border-orange-500/30 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.18),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-orange-500/10">
            <BadgeCheck size={40} className="text-orange-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Reels'ını Keşfete Çıkar</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">OptiSMM'a ücretsiz kayıt ol, Reels izlenme paketini seç ve videolarının algoritmik erişimini katlayarak artır.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-orange-500/30 hover:opacity-90 transition-all text-base">Reels Paketleri <ArrowRight size={20} /></Link>
              <Link href="/contact" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"><Clock size={16} /> 7/24 Destek</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
