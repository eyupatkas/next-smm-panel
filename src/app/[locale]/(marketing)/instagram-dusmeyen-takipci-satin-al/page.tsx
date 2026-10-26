import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import { Anchor, ShieldCheck, Zap, TrendingUp, Star, CheckCircle2, ArrowRight, Clock, Users, BadgeCheck, RotateCcw, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "Instagram Düşmeyen Takipçi Satın Al — Garantili | OptiSMM",
  description: "Instagram düşmeyen takipçi satın al! Garantili paket seçenekleri, düşüş sonrası ücretsiz tamamlama. Instagram büyümesi için OptiSMM tercih edin.",
  keywords: "instagram düşmeyen takipçi satın al, garantili instagram takipçi, kalıcı instagram takipçi, instagram takipçi düşüyor çözümü, instagram refill garantili takipçi",
  alternates: { canonical: `${siteUrl}/instagram-dusmeyen-takipci-satin-al`, languages: hreflangAlternates("/instagram-dusmeyen-takipci-satin-al") },
  openGraph: { title: "Instagram Düşmeyen Takipçi Satın Al | OptiSMM", description: "Garantili paket seçenekleriyle Instagram takipçi paketleri.", type: "website", url: `${siteUrl}/instagram-dusmeyen-takipci-satin-al`, siteName: "OptiSMM" },
};

const faqItems = [
  { q: "\"Düşmeyen\" takipçi gerçekten düşmez mi?", a: "Hiçbir platform %100 kalıcılık garantisi veremez çünkü Instagram kendi algoritmalarıyla periyodik temizlik yapar. OptiSMM'ın farkı: garantili paketlerde 30 gün içinde gerçekleşen düşüşleri ücretsiz yerine koymasıdır." },
  { q: "Refill garantisi nasıl çalışır?", a: "Garantili paketlerde teslimattan itibaren 30 gün içindeki takipçi kayıpları otomatik izlenerek ücretsiz yenilenir. Ek ücret veya işlem gerekmez." },
  { q: "Paketin normal takipçiden farkı nedir?", a: "Düşmeyen takipçi paketimiz daha yüksek profil kaliteli hesaplardan oluşur; bunlar Instagram temizliklerinde daha dayanıklıdır. Ayrıca genişletilmiş Refill süresiyle gelir." },
  { q: "Ne kadar sürede teslimat yapılıyor?", a: "Sipariş onayından sonra 15–90 dakika içinde takipçiler kademeli olarak eklenir. Büyük paketlerde 24–48 saat sürebilir." },
  { q: "Takipçiler düştüğünde ne yapmalıyım?", a: "Hesabınızdan veya sipariş panelimizden Refill talebinde bulunmanız yeterlidir. 24 saat içinde kayıplar telafi edilir." },
];

const features = [
  { icon: Anchor, title: "Güçlü Profil Kaliteli Takipçi", desc: "Instagram temizliklerine karşı daha dayanıklı kaliteli hesaplar.", color: "text-indigo-400", bg: "bg-indigo-500/15" },
  { icon: RotateCcw, title: "Otomatik Refill", desc: "30 gün içinde düşüş yaşarsanız otomatik yenileme.", color: "text-blue-400", bg: "bg-blue-500/15" },
  { icon: Zap, title: "Kademeli Teslimat", desc: "Doğal büyüme eğrisinde aşamalı takipçi ekleme.", color: "text-violet-400", bg: "bg-violet-500/15" },
  { icon: ShieldCheck, title: "Hesap Güvenliği", desc: "Şifresiz işlem, spam tetiklemeyecek hız profili.", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { icon: TrendingUp, title: "Kalıcı Büyüme", desc: "İzlenme ve etkileşim artışıyla organik büyümeni destekle.", color: "text-cyan-400", bg: "bg-cyan-500/15" },
  { icon: Lock, title: "Güvenli Ödeme", desc: "3D Secure altyapısıyla kartla veya bakiyeyle ödeme.", color: "text-pink-400", bg: "bg-pink-500/15" },
];

const steps = [
  { n: "01", title: "Kullanıcı Adını Gir", desc: "Instagram hesabınızın kullanıcı adını yazın; şifresiz işlem." },
  { n: "02", title: "Düşmeyen Paketi Seç", desc: "İhtiyacınıza uygun garantili takipçi miktarını belirleyin." },
  { n: "03", title: "Ödeme Yapın", desc: "Güvenli ödeme altyapısıyla 3D Secure işlemi tamamlayın." },
  { n: "04", title: "30 Gün Kesintisiz Büyüme", desc: "Takipçiler eklenir; 30 gün boyunca düşüşler otomatik yerine konulur." },
];

const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: "Instagram Düşmeyen Takipçi Satın Al", description: "OptiSMM üzerinden Garantili paket seçenekleriyle Instagram takipçisi kazanın.", provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl }, areaServed: "TR", url: `${siteUrl}/instagram-dusmeyen-takipci-satin-al` };
const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function InstagramDusmeyenTakipciPage() {
  return (
    <>
      <Script id="insta-dusmeyen-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="insta-dusmeyen-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.22),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-indigo-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg"><Anchor size={22} className="text-white" /></div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">Garantili Takipçi</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                Instagram Düşmeyen Takipçi Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 mt-1">Garantili Paketler, Kalıcı Görünümlü Büyüme</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                Takipçilerin düşmesinden sıkıldınız mı? OptiSMM düşmeyen takipçi paketleri otomatik Refill sistemiyle korunuyor. 30 gün boyunca her düşüş bir sonraki güne kadar telafi edilir.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-all">Garantili Paketler <ArrowRight size={18} /></Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">Ücretsiz Kayıt Ol</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["30 gün Refill", "Otomatik yenileme", "Kademeli teslimat", "Şifresiz işlem"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> {t}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Neden OptiSMM Düşmeyen?</p>
              <h2 className="text-3xl font-bold font-display">Garantili Büyümede Farkımız</h2>
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
              <h2 className="text-3xl font-bold font-display">4 Adımda Düşmeyen Takipçi Al</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">Neden Takipçiler Düşüyor ve Nasıl Önlenir?</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>Instagram periyodik olarak <strong className="text-foreground">sahte hesap temizleme algoritmaları</strong> çalıştırır. Bu temizliklerde kalitesiz veya inaktif hesaplar kaldırılır; bu da takipçi düşüşlerine yol açar. Piyasadaki ucuz paketlerin büyük çoğunluğu bu temizliklerden etkilenen hesaplara dayanır.</p>
              <p>OptiSMM'ın düşmeyen takipçi paketi <strong className="text-foreground">daha sağlam profil kaliteli hesaplar</strong> kullandığından Instagram temizliklerinde daha dayanıklıdır. Yine de hiçbir sistem mutlak kalıcılık vaat edemez; bu yüzden garantili paketlerde Refill garantimiz devreye girer.</p>
              <p>Otomatik Refill sistemi sayesinde takipçi sayınız <strong className="text-foreground">30 gün boyunca izlenir</strong> ve düşüş algılandığında otomatik olarak yerine konulur. Bu sistem ek ücret veya işlem gerektirmez, tamamen otomatik çalışır.</p>
              <p>Uzun vadeli Instagram büyümesi için düşmeyen takipçi paketini <strong className="text-foreground">kaliteli içerik ve organik etkileşim stratejisiyle</strong> birleştirmenizi öneririz. Bu kombinasyon hem güvenlik hem de sürdürülebilir büyüme sağlar.</p>
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

          <div className="rounded-[2.5rem] border border-indigo-500/30 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-indigo-500/10">
            <BadgeCheck size={40} className="text-indigo-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Garantili Büyümeye Geç</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">OptiSMM'a ücretsiz kayıt ol, düşmeyen takipçi paketini seç ve 30 gün boyunca takipçi sayını güvence altında tut.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-all text-base">Garantili Paketleri İncele <ArrowRight size={20} /></Link>
              <Link href="/contact" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"><Clock size={16} /> 7/24 Destek</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
