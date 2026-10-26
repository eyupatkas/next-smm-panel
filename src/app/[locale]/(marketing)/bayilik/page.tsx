import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import {
  HeartHandshake,
  Coins,
  Code2,
  BarChart3,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Clock,
  Users,
  TrendingUp,
  BadgeCheck,
  Rocket,
  Star,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "Bayilik — OptiSMM SMM Panel Bayi Ol, Kazanmaya Başla",
  description:
    "OptiSMM bayilik programına katıl! SMM panel bayisi olarak kendi müşterilerine hizmet sat, API ile otomatik çalış, minimum sipariş yok. Hemen başla.",
  keywords:
    "smm panel bayilik, instagram bayi, sosyal medya bayi, smm bayi api, takipçi satma bayilik, optismm bayi",
  alternates: {
    canonical: `${siteUrl}/bayilik`,
    languages: hreflangAlternates("/bayilik"),
  },
  openGraph: {
    title: "Bayilik — OptiSMM SMM Panel Bayi Ol | OptiSMM",
    description:
      "OptiSMM bayilik programıyla sosyal medya hizmetleri sat ve kazanmaya başla. API desteği, toplu fiyat, minimum sipariş yok.",
    type: "website",
    url: `${siteUrl}/bayilik`,
    siteName: "OptiSMM",
  },
};

const benefits = [
  {
    icon: Coins,
    title: "Toplu/Bayi Fiyatları",
    desc: "Bayi hesabıyla tüm hizmetlerde standart fiyatın altında özel fiyatlardan yararlanın. Ne kadar çok kullanırsanız o kadar kazanırsınız.",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  {
    icon: Code2,
    title: "Tam API Desteği",
    desc: "Standart SMM panel API formatı ile kendi sistemlerinize entegre edin. Otomatik sipariş, durum sorgulama ve bakiye kontrolü.",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    icon: Globe,
    title: "10+ Platform",
    desc: "Instagram'dan TikTok'a, YouTube'dan Telegram'a kadar tüm platformlarda müşterilerinize hizmet sunun.",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  {
    icon: Zap,
    title: "Anlık Teslimat",
    desc: "Müşterilerinize hız vaat ettiğinizde zamanında teslim edilmesini sağlarız. Otomatik sistem 7/24 çalışır.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    icon: BarChart3,
    title: "Sipariş Yönetim Paneli",
    desc: "Tüm müşteri siparişlerini tek bir panodan izleyin. Detaylı raporlar ve gerçek zamanlı durum bilgisi.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Güvenilir Altyapı",
    desc: "Yıllık SLA ve uptime garantisiyle işinizi sekteye uğratacak kesintilere son verin. Stabil bir alt yapı.",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
  },
];

const steps = [
  {
    n: "01",
    title: "Ücretsiz Kayıt",
    desc: "OptiSMM'a kayıt olun. Hesabınız standart kullanıcı olarak açılır; bayi özellikleri otomatik aktif gelir.",
    icon: Users,
  },
  {
    n: "02",
    title: "Bakiye Yükle",
    desc: "Kredi kartı veya banka kartıyla hesabınıza bakiye yükleyin. Toplu yükleme ile ek avantajlar kazanın.",
    icon: Coins,
  },
  {
    n: "03",
    title: "API Anahtarı Al",
    desc: "Hesap ayarlarından API anahtarınızı oluşturun. Tüm servisleri programatik olarak yönetin.",
    icon: Code2,
  },
  {
    n: "04",
    title: "Sipariş Ver, Kazanmaya Başla",
    desc: "Kendi müşterilerinize istediğiniz fiyatla hizmet satın. Aradaki fark sizin kazancınız.",
    icon: TrendingUp,
  },
];

const faqItems = [
  {
    q: "OptiSMM bayilik programı nasıl çalışır?",
    a: "OptiSMM'a kayıt olan her kullanıcı otomatik olarak bayi özelliklerine erişir. API anahtarı alabilir, toplu sipariş verebilir ve kendi uygulamanıza veya reseller panelinize entegre edebilirsiniz. Aradaki fiyat farkı sizin kazancınız olur.",
  },
  {
    q: "Minimum sipariş veya bakiye zorunluluğu var mı?",
    a: "Hayır. OptiSMM'ta minimum sipariş miktarı veya minimum bakiye yükleme zorunluluğu yoktur. İstediğiniz miktarda sipariş verebilir, istediğiniz miktarda bakiye yükleyebilirsiniz.",
  },
  {
    q: "Müşterilerimin siparişlerini nasıl yönetirim?",
    a: "API entegrasyonu ile müşterilerinizden gelen siparişleri otomatik olarak OptiSMM'a iletebilirsiniz. Ayrıca panel üzerinden manuel sipariş takibi de yapabilirsiniz. Her siparişin anlık durumu API üzerinden sorgulanabilir.",
  },
  {
    q: "Hangi platformlarda hizmet sunabilirim?",
    a: "Instagram, TikTok, YouTube, Twitter/X, Spotify, Telegram ve daha fazlası. OptiSMM'ta 10'dan fazla platform için yüzlerce farklı hizmet seçeneği mevcuttur. Yeni platformlar sürekli eklenmektedir.",
  },
  {
    q: "Özel fiyatlandırma veya white-label çözüm mümkün mü?",
    a: "Daha büyük hacimli işletmeler için özel fiyatlandırma görüşmesi yapabiliriz. Yüksek hacimli bayiler için destek ekibimizle doğrudan iletişime geçin.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "OptiSMM Bayilik Programı",
  description:
    "OptiSMM SMM panel bayilik programına katılın, sosyal medya hizmetlerini kendi müşterilerinize satın.",
  url: `${siteUrl}/bayilik`,
  provider: {
    "@type": "Organization",
    name: "OptiSMM",
    url: siteUrl,
  },
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

export default function BayilikPage() {
  return (
    <>
      <Script id="bayilik-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <Script id="bayilik-faq-jsonld" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>

      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">

          {/* ── Hero ── */}
          <div className="rounded-[2.5rem] border border-emerald-500/20 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.2),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-emerald-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <HeartHandshake size={22} className="text-white" />
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-emerald-500/30 text-emerald-400/80">
                  Bayilik Programı
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                OptiSMM Bayilik
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mt-1">
                  Bayi Olun, Kazanmaya Başlayın
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                OptiSMM'un güçlü SMM altyapısını kullanarak kendi müşterilerinize
                sosyal medya büyütme hizmetleri satın. API entegrasyonu, toplu fiyatlar
                ve minimum sipariş zorunluluğu olmadan dilediğiniz ölçekte çalışın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-emerald-500/30 hover:opacity-90 transition-all"
                >
                  <Rocket size={18} /> Hemen Bayi Ol
                </Link>
                <Link
                  href="/api-docs"
                  className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all"
                >
                  <Code2 size={16} /> API Dökümanı
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["Minimum sipariş yok", "Toplu fiyatlar", "API otomasyon", "7/24 çalışır"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Kazanç Potansiyeli Banner ── */}
          <div className="grid gap-5 md:grid-cols-3 text-center">
            {[
              { label: "Hizmet Çeşidi", value: "500+", desc: "Farklı platform ve kategori" },
              { label: "Teslimat Süresi", value: "0–5 dk", desc: "Çoğu hizmette anlık başlangıç" },
              { label: "Kazanç Modeli", value: "%100", desc: "Fiyat farkı tamamen sizin" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-card to-card/60 p-6">
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">{s.value}</p>
                <p className="font-bold mt-1">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Faydalar ── */}
          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Bayi Avantajları</p>
              <h2 className="text-3xl font-bold font-display">Neden OptiSMM Bayisi?</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Güçlü bir altyapı, düşük maliyet ve yüksek esneklik — bayilik için ihtiyacınız olan her şey burada.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((b) => (
                <Card key={b.title} className="border-white/10 bg-gradient-to-br from-card to-card/60 shadow-xl hover:border-white/20 transition-all hover:-translate-y-0.5">
                  <CardContent className="p-6">
                    <div className={`w-11 h-11 rounded-2xl ${b.bg} flex items-center justify-center mb-4`}>
                      <b.icon size={22} className={b.color} />
                    </div>
                    <h3 className="font-bold text-base mb-1.5">{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-6">{b.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ── Nasıl Başlanır ── */}
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-card to-card/70 p-8 md:p-12">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Başlangıç Rehberi</p>
              <h2 className="text-3xl font-bold font-display">4 Adımda Bayi Olun</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              {steps.map((s) => (
                <div key={s.n} className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                    <span className="text-lg font-black text-emerald-400">{s.n}</span>
                  </div>
                  <h3 className="font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-6">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bayilik ile Kazanmak ── */}
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold font-display mb-6">
              SMM Bayi Olarak Gelir Elde Edin
            </h2>
            <div className="space-y-5 text-muted-foreground leading-8">
              <p>
                Sosyal medya hizmetlerine olan talep her geçen yıl artmaktadır. Küçük işletmeler,
                bireysel girişimciler, influencer'lar ve içerik üreticileri — hepsi hesaplarını
                büyütmek için profesyonel çözümlere ihtiyaç duyar. OptiSMM bayilik programı,
                <strong className="text-foreground"> bu talebi karşılamanın en kolay yolunu</strong> size sunar.
              </p>
              <p>
                Çalışma modeli son derece basittir: OptiSMM'tan toplu/bayi fiyatıyla hizmet satın
                alır, kendi müşterilerinize istediğiniz fiyattan satarsınız. İki fiyat arasındaki
                fark sizin kârınızdır. Aylık sabit gider yok, franchise ücreti yok, minimum
                hacim zorunluluğu yok.
              </p>
              <p>
                OptiSMM'un <strong className="text-foreground">açık REST API</strong>'si sayesinde kendi web sitenizi
                veya mobil uygulamanızı kolayca entegre edebilirsiniz. Müşterileriniz sipariş
                verdiğinde sistem otomatik olarak OptiSMM'a iletir; müşteriniz siparişin
                teslim edildiğini görür, siz ise hiç vakit kaybetmezsiniz.
              </p>
              <p>
                Sosyal medya ajansları için özellikle güçlü bir çözüm olan OptiSMM bayiliği,
                dijital pazarlama hizmeti veren freelance çalışanlar için de mükemmel bir pasif
                gelir kaynağıdır. Hesabınıza bakiye yükleyin, API'yi kurun ve sistem
                <strong className="text-foreground"> 7/24 sizin adınıza çalışsın</strong>.
              </p>
            </div>
          </div>

          {/* ── SSS ── */}
          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Sık Sorulan Sorular</p>
              <h2 className="text-3xl font-bold font-display">Bayilik Hakkında Her Şey</h2>
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              {faqItems.map(({ q, a }) => (
                <details
                  key={q}
                  className="group rounded-2xl border border-white/10 bg-card/60 hover:border-white/20 transition-all"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-sm select-none list-none">
                    <span>{q}</span>
                    <Star size={14} className="shrink-0 text-primary/60 group-open:text-primary transition-colors" />
                  </summary>
                  <p className="px-6 pb-5 text-sm text-muted-foreground leading-7">{a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="rounded-[2.5rem] border border-emerald-500/30 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.2),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-emerald-500/10">
            <BadgeCheck size={40} className="text-emerald-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">
              Bugün Bayi Olun
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">
              Ücretsiz hesap oluşturun, API anahtarınızı alın ve kendi müşterilerinize
              hizmet satmaya hemen başlayın. En küçük bütçeyle bile başlayabilirsiniz.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-emerald-500/30 hover:opacity-90 transition-all text-base"
              >
                <Rocket size={20} /> Ücretsiz Bayi Hesabı Aç
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"
              >
                <Clock size={16} /> Bize Ulaşın
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
