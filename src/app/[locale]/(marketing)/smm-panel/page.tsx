import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import {
  Zap,
  Globe,
  Code2,
  BarChart3,
  ShieldCheck,
  Layers,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  Clock,
  Users,
  Play,
  Heart,
  MessageCircle,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const metadata: Metadata = {
  title: "SMM Panel — Sosyal Medya Büyütme Merkezi | OptiSMM",
  description:
    "OptiSMM SMM panel ile Instagram, TikTok, YouTube, Twitter ve daha fazlası için takipçi, beğeni, izlenme hizmetleri. Bayi API desteği, anlık teslimat, uygun fiyat.",
  keywords:
    "smm panel, türkiye smm panel, sosyal medya paneli, instagram smm, tiktok smm, youtube smm, bayi smm panel, api smm panel",
  alternates: {
    canonical: `${siteUrl}/smm-panel`,
    languages: hreflangAlternates("/smm-panel"),
  },
  openGraph: {
    title: "SMM Panel — Sosyal Medya Büyütme Merkezi | OptiSMM",
    description:
      "Türkiye'nin en güvenilir SMM paneli. Instagram, TikTok, YouTube için anlık teslimat ve bayi API desteği.",
    type: "website",
    url: `${siteUrl}/smm-panel`,
    siteName: "OptiSMM",
  },
};

const platforms = [
  { name: "Instagram", icon: Heart, color: "from-pink-500 to-orange-500", services: "Takipçi & Beğeni & Görüntülenme & Yorum" },
  { name: "TikTok", icon: Play, color: "from-slate-800 to-slate-600", services: "Takipçi & Beğeni & İzlenme & Paylaşım" },
  { name: "YouTube", icon: Play, color: "from-red-600 to-red-500", services: "Abone & İzlenme & Beğeni & Yorum" },
  { name: "Twitter / X", icon: MessageCircle, color: "from-slate-700 to-slate-500", services: "Takipçi & Beğeni & Retweet & İzlenme" },
  { name: "Spotify", icon: TrendingUp, color: "from-green-600 to-green-500", services: "Dinlenme & Takipçi & Kaydetme" },
  { name: "Telegram", icon: MessageCircle, color: "from-sky-600 to-sky-500", services: "Üye & Görüntülenme & Tepki" },
];

const features = [
  {
    icon: Zap,
    title: "Anında Teslimat",
    desc: "Siparişleriniz saniyeler içinde sisteme alınır ve çoğu hizmette 0–5 dakika içinde başlar.",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  {
    icon: Globe,
    title: "10+ Platform",
    desc: "Instagram, TikTok, YouTube, Twitter ve daha fazlası — tek panel altında.",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  {
    icon: Code2,
    title: "Geliştirici API",
    desc: "REST API ile kendi uygulamanıza veya bot sisteminize entegre edin.",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    icon: BarChart3,
    title: "Sipariş Takibi",
    desc: "Her siparişin durumunu gerçek zamanlı takip edin. Tam şeffaflık.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli Ödeme",
    desc: "PayTR 3D Secure ile kartınız tam güvende. Bakiye sistemiyle toplu yükleme yapın.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
  },
  {
    icon: HeartHandshake,
    title: "7/24 Destek",
    desc: "Canlı chat, WhatsApp ve e-posta ile 7/24 teknik destek ekibimize ulaşabilirsiniz.",
    color: "text-pink-400",
    bg: "bg-pink-500/15",
  },
];

const faqItems = [
  {
    q: "SMM panel nedir?",
    a: "SMM (Social Media Marketing) panel, sosyal medya büyütme hizmetlerinin toplu ve otomasyon destekli biçimde sunulduğu bir platformdur. Bireysel kullanıcılar ve ajanslar, tek bir panel üzerinden birden fazla platform için takipçi, beğeni ve izlenme satın alabilir.",
  },
  {
    q: "OptiSMM'ta hangi platformlar destekleniyor?",
    a: "Instagram, TikTok, YouTube, Twitter (X), Spotify, Telegram, Facebook ve daha fazla platform OptiSMM'ta aktiftir. Yeni platformlar sürekli eklenmektedir.",
  },
  {
    q: "API entegrasyonu nasıl yapılır?",
    a: "Hesabınıza giriş yaptıktan sonra API Dokümantasyonu bölümünden API anahtarınızı alabilirsiniz. Standart SMM panel API formatını destekliyoruz; bu sayede mevcut otomasyon araçlarınızla kolayca entegre olabilirsiniz.",
  },
  {
    q: "Minimum sipariş tutarı var mı?",
    a: "Hayır, minimum sipariş zorunluluğu yoktur. Her bütçeye uygun paketlerimizle küçük veya büyük siparişler verebilirsiniz.",
  },
  {
    q: "Ödeme yöntemleri nelerdir?",
    a: "Kredi/banka kartı (Visa, Mastercard), PayTR ve bakiye yükleme yöntemlerini kabul ediyoruz. Bayi hesapları için toplu bakiye yükleme avantajları mevcuttur.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OptiSMM SMM Panel",
  applicationCategory: "SocialNetworkingApplication",
  description:
    "Instagram, TikTok, YouTube ve daha fazlası için profesyonel sosyal medya büyütme paneli.",
  operatingSystem: "Web",
  url: `${siteUrl}/smm-panel`,
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    priceCurrency: "TRY",
  },
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

export default function SmmPanelPage() {
  return (
    <>
      <Script id="smm-app-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <Script id="smm-faq-jsonld" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>

      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">

          {/* ── Hero ── */}
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.25),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-violet-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Layers size={22} className="text-white" />
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-violet-500/30 text-violet-400/80">
                  SMM Hizmetleri
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                SMM Panel — Sosyal Medya
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400 mt-1">
                  Büyütme Merkezi
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                OptiSMM SMM paneli ile Instagram, TikTok, YouTube ve çok daha fazlası
                için anlık, güvenilir ve uygun fiyatlı sosyal medya büyütme hizmetlerine
                erişin. Bireysel kullanıcı veya bayi fark etmez — her ihtiyaca çözüm sunuyoruz.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-blue-600 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-violet-500/30 hover:opacity-90 transition-all"
                >
                  Ücretsiz Başla <ArrowRight size={18} />
                </Link>
                <Link
                  href="/api-docs"
                  className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all"
                >
                  <Code2 size={16} /> API Dökümanı
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["10+ platform", "API entegrasyon", "Anlık teslimat", "Bayi fiyatları"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Desteklenen Platformlar ── */}
          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Desteklenen Platformlar</p>
              <h2 className="text-3xl font-bold font-display">10'dan Fazla Platformda Hizmet</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Tek hesapla tüm sosyal medya platformlarını yönetin. Yeni platformlar sürekli eklenmektedir.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platforms.map((p) => (
                <Card key={p.name} className="border-white/10 bg-card/60 hover:border-white/20 transition-all hover:-translate-y-0.5 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-md`}>
                        <p.icon size={18} className="text-white" />
                      </div>
                      <span className="font-bold">{p.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.services}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ── Özellikler ── */}
          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Neden OptiSMM?</p>
              <h2 className="text-3xl font-bold font-display">Profesyonel SMM Altyapısı</h2>
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

          {/* ── SMM Panel Ne İşe Yarar ── */}
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-card to-card/70 p-8 md:p-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-4">Bilgi</p>
                <h2 className="text-3xl font-bold font-display mb-5">
                  SMM Panel Nasıl Çalışır?
                </h2>
                <div className="space-y-4 text-muted-foreground leading-7 text-sm">
                  <p>
                    Sosyal medya pazarlama (SMM) panelleri, sosyal ağlardaki hesapları büyütmek için
                    kullanılan toplu sipariş platformlarıdır. OptiSMM gibi SMM panelleri; takipçi,
                    beğeni, izlenme ve etkileşim gibi metrikleri artırmak için son derece verimli
                    bir altyapı sunar.
                  </p>
                  <p>
                    Sisteme kayıt olduktan sonra bakiyenize yükleme yaparsınız ve dilediğiniz
                    platformda dilediğiniz hizmeti sipariş edersiniz. Siparişler anında sisteme
                    aktarılır, siz de gerçek zamanlı olarak durumu takip edebilirsiniz.
                  </p>
                  <p>
                    Bayi olmak isteyenler için OptiSMM ayrı bir toplu fiyatlandırma modeli
                    sunmaktadır. API entegrasyonu sayesinde kendi müşterilerinize otomatik hizmet
                    sunabilirsiniz. Bu, sosyal medya ajansları ve freelance pazarlamacılar için
                    güçlü bir gelir kaynağı oluşturur.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Users, label: "Takipçi Artırma", v: "Instagram · TikTok · YouTube" },
                  { icon: Heart, label: "Beğeni Hizmetleri", v: "Anlık veya yavaş akış" },
                  { icon: TrendingUp, label: "İzlenme & Reach", v: "Organik görünüm" },
                  { icon: Code2, label: "API Otomasyon", v: "Kendi panelinizi kurun" },
                ].map((i) => (
                  <div key={i.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <i.icon size={22} className="text-primary mb-3" />
                    <p className="font-semibold text-sm">{i.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{i.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SSS ── */}
          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Sık Sorulan Sorular</p>
              <h2 className="text-3xl font-bold font-display">Merak Ettikleriniz</h2>
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              {faqItems.map(({ q, a }) => (
                <details
                  key={q}
                  className="group rounded-2xl border border-white/10 bg-card/60 hover:border-white/20 transition-all"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-sm select-none list-none">
                    <span>{q}</span>
                    <Zap size={14} className="shrink-0 text-primary/60 group-open:text-primary transition-colors" />
                  </summary>
                  <p className="px-6 pb-5 text-sm text-muted-foreground leading-7">{a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="rounded-[2.5rem] border border-violet-500/30 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.2),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-violet-500/10">
            <BadgeCheck size={40} className="text-violet-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">
              Bugün Başla, Hemen Büyü
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">
              Ücretsiz hesap oluştur, tüm platformlar ve hizmetleri keşfet.
              İlk siparişini ver ve OptiSMM farkını yaşa.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-blue-600 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-violet-500/30 hover:opacity-90 transition-all text-base"
              >
                Ücretsiz Kayıt Ol <ArrowRight size={20} />
              </Link>
              <Link
                href="/bayilik"
                className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"
              >
                <HeartHandshake size={16} /> Bayi Ol
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
