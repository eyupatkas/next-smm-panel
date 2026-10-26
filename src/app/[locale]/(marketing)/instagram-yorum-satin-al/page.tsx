import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import { MessageSquare, ShieldCheck, Zap, TrendingUp, Star, CheckCircle2, ArrowRight, Clock, HeartHandshake, BadgeCheck, Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "Instagram Yorum Satın Al — Türkçe & Gerçek Yorumlar | OptiSMM",
  description: "Instagram yorum satın al! Gönderilerinize özel Türkçe veya İngilizce gerçek görünümlü yorumlar ekleyin. Anlık teslimat, şifresiz işlem. OptiSMM ile etkileşiminizi artırın.",
  keywords: "instagram yorum satın al, instagram türkçe yorum, instagram yorum artırma, ucuz instagram yorum, gerçek instagram yorum, instagram özel yorum",
  alternates: { canonical: `${siteUrl}/instagram-yorum-satin-al`, languages: hreflangAlternates("/instagram-yorum-satin-al") },
  openGraph: { title: "Instagram Yorum Satın Al | OptiSMM", description: "Gönderilerinize özel Türkçe ve İngilizce yorumlar. Anlık teslimat.", type: "website", url: `${siteUrl}/instagram-yorum-satin-al`, siteName: "OptiSMM" },
};

const faqItems = [
  { q: "Instagram yorum satın almak güvenli mi?", a: "OptiSMM olarak gerçek görünümlü profil kalitesinde hesaplardan yorum yapıyoruz. Hesabınıza zarar verebilecek bot tabanlı işlemler kullanmıyoruz." },
  { q: "Yorumlar hangi dilde gelir?", a: "OptiSMM'ta Türkçe, İngilizce ve karma dil seçenekleri bulunur. Sipariş sırasında hangi dili istediğinizi belirleyebilirsiniz." },
  { q: "Özel yorum metni belirleyebilir miyim?", a: "Evet. OptiSMM'ta özel (custom) yorum paketleri mevcuttur; gönderilecek yorum metinlerini kendiniz belirleyebilirsiniz." },
  { q: "Yorumlar ne kadar sürede gelir?", a: "Sipariş onayından sonra 5–30 dakika içinde yorumlar gelmeye başlar. Büyük paketlerde dağıtımlı teslimat yapılır." },
  { q: "Yorum almak etkileşim oranını etkiler mi?", a: "Evet. Instagram algoritması yorum ve kaydetme gibi derin etkileşim sinyallerine yüksek ağırlık verir. Yorum artışı keşfet görünürlüğünü doğrudan destekler." },
];

const features = [
  { icon: MessageSquare, title: "Türkçe + Özel Yorumlar", desc: "Kendi belirlediğiniz metinlerde özel Türkçe yorum seçeneği.", color: "text-amber-400", bg: "bg-amber-500/15" },
  { icon: Zap, title: "Anlık Teslimat", desc: "Siparişten kısa süre sonra yorumlar gönderinize eklenir.", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { icon: Globe, title: "Çoklu Dil Desteği", desc: "Türkçe, İngilizce ve uluslararası yorum seçenekleri.", color: "text-blue-400", bg: "bg-blue-500/15" },
  { icon: HeartHandshake, title: "Garantili Paketler", desc: "Garantili yorum paketlerinde silinen yorumlar ücretsiz yenilenir.", color: "text-pink-400", bg: "bg-pink-500/15" },
  { icon: TrendingUp, title: "Derin Etkileşim Sinyali", desc: "Yorumlar Instagram algoritmasının en değerli etkileşim sinyalidir.", color: "text-violet-400", bg: "bg-violet-500/15" },
  { icon: Lock, title: "Güvenli Ödeme", desc: "PayTR 3D Secure altyapısıyla güvenli ödeme.", color: "text-cyan-400", bg: "bg-cyan-500/15" },
];

const steps = [
  { n: "01", title: "Gönderi Linkini Kopyala", desc: "Yorum almak istediğiniz Instagram gönderisinin linkini kopyalayın." },
  { n: "02", title: "Paket ve Yorum Tipi Seçin", desc: "Normal veya özel yorum seçeneğini ve adet belirleyin." },
  { n: "03", title: "Ödeme Yapın", desc: "Kredi kartı, banka kartı veya mevcut bakiyeyle ödeme." },
  { n: "04", title: "Yorumlar Gelsin", desc: "30 dakika içinde yorumlar gönderinize eklenmeye başlar." },
];

const jsonLd = { "@context": "https://schema.org", "@type": "Service", name: "Instagram Yorum Satın Al", description: "OptiSMM üzerinden Instagram gönderilerinize hızlı yorum satın alın.", provider: { "@type": "Organization", name: "OptiSMM", url: siteUrl }, areaServed: "TR", url: `${siteUrl}/instagram-yorum-satin-al` };
const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };

export default function InstagramYorumPage() {
  return (
    <>
      <Script id="insta-yorum-jsonld" type="application/ld+json">{JSON.stringify(jsonLd)}</Script>
      <Script id="insta-yorum-faq-jsonld" type="application/ld+json">{JSON.stringify(faqJsonLd)}</Script>
      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(234,179,8,0.22),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-yellow-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg"><MessageSquare size={22} className="text-white" /></div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">Instagram Yorum</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                Instagram Yorum Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400 mt-1">Türkçe ve Özel Yorum Seçenekleri</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                Instagram gönderilerinizin etkileşim derinliğini artırmak mı istiyorsunuz? OptiSMM ile Türkçe veya özel metin yorumları kazanın; platform algoritmalarını tetikleyin ve organik büyümenizi hızlandırın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-yellow-500/30 hover:opacity-90 transition-all">Yorum Paketleri <ArrowRight size={18} /></Link>
                <Link href="/signup" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all">Ücretsiz Kayıt Ol</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Türkçe yorum", "Özel metin", "Anlık teslimat", "Şifre gerekmez"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> {t}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Neden OptiSMM?</p>
              <h2 className="text-3xl font-bold font-display">Yorum Almada Farkımız</h2>
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
              <h2 className="text-3xl font-bold font-display">4 Adımda Instagram Yorum</h2>
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
            <h2 className="text-3xl font-bold font-display mb-6">Instagram Yorumlar Neden Kritik?</h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>Instagram algoritması etkileşim sinyallerini değerlendirirken yorumu <strong className="text-foreground">en derin etkileşim biçimi</strong> olarak kabul eder. Yorum bırakmak, beğeniye kıyasla çok daha fazla zaman ve niyet gerektirdiğinden algoritmik ağırlığı yüksektir.</p>
              <p>E-ticaret ve hizmet hesapları için yorum sayısı doğrudan <strong className="text-foreground">sosyal kanıt ve güven sinyali</strong>dir. Potansiyel müşteriler ürün veya hizmet gönderisinde onlarca yorum gördüğünde satın alma kararı kolaylaşır.</p>
              <p>Özel (custom) yorum paketiyle içeriğinize uygun konuşmalar yaratabilir, <strong className="text-foreground">marka mesajınızı güçlendiren</strong> yorumlar ekleyebilirsiniz. Bu yöntem özellikle ürün lansmanları ve kampanya duyurularında çok etkilidir.</p>
              <p>OptiSMM'ın Instagram yorum hizmetleri Türkçe, İngilizce ve özel metin seçenekleriyle <strong className="text-foreground">her içerik stratejisine</strong> uyum sağlar. Yerel markalar Türkçe yorum, global hesaplar İngilizce veya karma yorum seçeneğiyle büyüyebilir.</p>
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

          <div className="rounded-[2.5rem] border border-yellow-500/30 bg-[radial-gradient(ellipse_at_top,rgba(234,179,8,0.18),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-yellow-500/10">
            <BadgeCheck size={40} className="text-yellow-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Etkileşimini Derinleştir</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">OptiSMM'a ücretsiz kayıt ol, yorum paketini seç ve gönderilerine anlamlı etkileşim ekle.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/instagram" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-yellow-500/30 hover:opacity-90 transition-all text-base">Yorum Paketlerini İncele <ArrowRight size={20} /></Link>
              <Link href="/contact" className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"><Clock size={16} /> 7/24 Destek</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
