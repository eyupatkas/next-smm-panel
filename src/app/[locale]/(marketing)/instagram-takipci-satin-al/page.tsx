import type { Metadata } from "next";
import { hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import Script from "next/script";
import { getLandingPageData } from "@/lib/data/landing-pages";
import { db } from "@/lib/db";
import {
  Users,
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
const pageSlug = "instagram-takipci-satin-al";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dbData = await getLandingPageData(pageSlug, locale);

  const title = dbData?.seoTitle || "Instagram Takipçi Satın Al — Güvenli, Hızlı, Organik | OptiSMM";
  const description = dbData?.seoDescription || "Instagram takipçi satın al! Türk ve dünya takipçisi seçenekleriyle organik görünümlü büyüme. Anlık başlangıç, güvenli ödeme, 7/24 destek. OptiSMM ile hesabını büyüt.";

  return {
    title,
    description,
    keywords: "instagram takipçi satın al, türk instagram takipçi, instagram takipçi artırma, organik instagram takipçi, ucuz instagram takipçi, gerçek instagram takipçi",
    alternates: { canonical: `${siteUrl}/${pageSlug}`, languages: hreflangAlternates(`/${pageSlug}`) },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${siteUrl}/${pageSlug}`,
      siteName: "OptiSMM",
    },
  };
}

const defaultFaqItems = [
  {
    q: "Instagram takipçi satın almak güvenli mi?",
    a: "OptiSMM olarak yalnızca gerçek görünümlü, kaliteli profiller kullanan yöntemler sunuyoruz. Hesabınıza zarar verebilecek bot veya sahte hesap yöntemleri kullanmıyoruz. Tüm işlemler Instagram'ın API kuralları çerçevesinde gerçekleştirilir.",
  },
  {
    q: "Takipçiler ne kadar sürede gelir?",
    a: "Sipariş onaylandıktan sonra çoğu paket için 0–3 dakika içinde teslimat başlar. Büyük hacimli siparişlerde 1–24 saat arasında yavaş akışlı (drip-feed) teslimat yapılarak daha organik bir görünüm sağlanır.",
  },
  {
    q: "Türk takipçi mi, dünya takipçisi mi seçmeliyim?",
    a: "Türkiye'de yerel bir marka veya kişisel hesap işletiyorsanız Türk takipçi; uluslararası içerik üretiyorsanız dünya takipçisi daha etkilidir. Her iki seçeneği de OptiSMM'ta bulabilirsiniz.",
  },
  {
    q: "Takipçiler düşer mi?",
    a: "Yüksek kaliteli paketlerde düşme oranı son derece düşüktür. Telafi (refill) garantisi yalnızca garantili paketlerde geçerlidir; kapsam ve süre paket detayında belirtilir, garanti süresi içinde düşen miktar ücretsiz tamamlanır.",
  },
  {
    q: "Ödeme nasıl yapılır?",
    a: "Kredi kartı, banka kartı ve PayTR altyapısıyla güvenli 3D Secure ödeme alıyoruz. Bakiye yükleyerek de sipariş verebilirsiniz.",
  },
];

const features = [
  {
    icon: Zap,
    title: "Anlık Başlangıç",
    desc: "Sipariş onaylandıktan saniyeler içinde teslimat süreci başlar. Bekleme yok.",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli & Gizli",
    desc: "Hesap bilgilerinizi asla istemiyoruz. Sadece kullanıcı adı yeterli.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    icon: Globe,
    title: "Türk + Dünya Seçeneği",
    desc: "Hedef kitlenize göre Türk takipçi veya uluslararası takipçi paketi seçin.",
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
    title: "Organik Görünüm",
    desc: "Drip-feed (yavaş akış) seçeneğiyle büyüme organik ve doğal görünür.",
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
  { n: "01", title: "Platform Seçimi", desc: "Instagram kategorisine girin, beğendiğiniz takipçi paketini seçin." },
  { n: "02", title: "Kullanıcı Adı Girin", desc: "Hesabınızın kullanıcı adını yazın. Şifre veya ekstra bilgi gerekmez." },
  { n: "03", title: "Ödeme Yapın", desc: "Kredi kartı, banka kartı veya mevcut bakiyenizle ödemeyi tamamlayın." },
  { n: "04", title: "Teslimat Başlasın", desc: "Siparişiniz sıraya girer ve saniyeler içinde gönderim başlar." },
];

export default async function InstagramTakipciPage() {
  const dbData = await getLandingPageData(pageSlug);

  const finalFaqItems = dbData?.faqItems && Array.isArray(dbData.faqItems) && dbData.faqItems.length > 0 
    ? dbData.faqItems 
    : defaultFaqItems;

  const h1Text = dbData?.h1 || "Instagram Takipçi Satın Al";
  const heroDescText = dbData?.heroDescription || "Instagram hesabınızı kısa sürede büyütmek mi istiyorsunuz? OptiSMM ile Türk ve dünya takipçisi seçenekleri arasından seçim yapın; anlık teslimat, güvenli ödeme ve 7/24 destek güvencesiyle hesabınızı bir üst seviyeye taşıyın.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: h1Text,
    description: dbData?.seoDescription || "OptiSMM üzerinden güvenli ve hızlı Instagram takipçi satın alın.",
    provider: {
      "@type": "Organization",
      name: "OptiSMM",
      url: siteUrl,
    },
    areaServed: "TR",
    url: `${siteUrl}/${pageSlug}`,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: finalFaqItems.map((item: any) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  // Fetch recent related blog posts
  const platformName = dbData?.platform || "instagram";
  const relatedPosts = await db.blogPost.findMany({
    where: { published: true, translations: { string_contains: platformName } }, // Basitçe fallback, gerçek senaryoda category/topic bazlı yapılabilir
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return (
    <>
      <Script id="insta-service-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <Script id="insta-faq-jsonld" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>

      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-4 space-y-16">

          {/* ── Hero ── */}
          <div className="rounded-[2.5rem] border border-primary/20 bg-[radial-gradient(ellipse_at_top_left,rgba(14,165,233,0.25),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 md:p-14 shadow-2xl shadow-sky-500/10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Users size={22} className="text-white" />
                </div>
                <Badge variant="outline" className="text-xs uppercase tracking-widest border-primary/30 text-primary/80">
                  Instagram Hizmetleri
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">
                Instagram Takipçi Satın Al
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mt-1">
                  Güvenli, Hızlı ve Organik Büyüme
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-8 max-w-2xl">
                Instagram hesabınızı kısa sürede büyütmek mi istiyorsunuz? OptiSMM ile
                Türk ve dünya takipçisi seçenekleri arasından seçim yapın; anlık teslimat,
                güvenli ödeme ve 7/24 destek güvencesiyle hesabınızı bir üst seviyeye taşıyın.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/instagram"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-pink-500/30 hover:opacity-90 transition-all"
                >
                  Paketleri Gör <ArrowRight size={18} />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-foreground font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-all"
                >
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

          {/* ── Neden OptiSMM? ── */}
          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Neden OptiSMM?</p>
              <h2 className="text-3xl font-bold font-display">Farkımızı Hissedin</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Binlerce müşterinin tercih ettiği OptiSMM, kalite ve güvenilirliği ön planda tutarak Instagram büyütme hizmetleri sunar.
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

          {/* ── Nasıl Çalışır ── */}
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-card to-card/70 p-8 md:p-12">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Süreç</p>
              <h2 className="text-3xl font-bold font-display">4 Adımda Instagram Büyütme</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              {steps.map((s) => (
                <div key={s.n} className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                    <span className="text-lg font-black text-primary">{s.n}</span>
                  </div>
                  <h3 className="font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-6">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Zengin SEO Makalesi / İçerik ── */}
          <div className="max-w-4xl">
            {dbData?.content ? (
              <div 
                className="prose prose-invert max-w-none prose-p:leading-8 prose-headings:font-display prose-headings:mb-6 prose-a:text-primary"
                dangerouslySetInnerHTML={{ __html: dbData.content }}
              />
            ) : (
              <>
                <h2 className="text-3xl font-bold font-display mb-6">
                  Instagram Takipçi Sayısı Neden Önemli?
                </h2>
                <div className="space-y-5 text-muted-foreground leading-8">
                  <p>
                    Instagram'da güçlü bir takipçi kitlesi, markanızın ya da kişisel hesabınızın
                    sosyal kanıt değerini doğrudan etkiler. Yeni bir kullanıcı profilinizi
                    ziyaret ettiğinde, yüksek takipçi sayısı ona "bu hesap güvenilir" mesajı verir.
                    Bu etki, <strong className="text-foreground">dönüşüm oranınızı ve organik keşif görünürlüğünüzü</strong> artırır.
                  </p>
                  <p>
                    Instagram algoritması, etkileşim oranı yüksek hesapları keşfet bölümünde öne
                    çıkarır. Daha fazla takipçi, daha fazla potansiyel etkileşim demektir; bu da
                    organik büyümeyi hızlandıran bir döngü yaratır. Özellikle yeni açılan hesaplar
                    için bu ivme, aylarca sürebilecek organik bekleme sürecini önemli ölçüde kısaltır.
                  </p>
                  <p>
                    İşletmeler, influencer'lar ve içerik üreticileri için takipçi sayısı aynı zamanda
                    bir <strong className="text-foreground">gelir kapısı</strong>dır. Sponsorlu içerik teklifleri, 
                    affiliate anlaşmaları ve marka iş birlikleri, hesabın büyüklüğüne göre şekillenir.
                    OptiSMM'ın sunduğu hızlı ve güvenilir takipçi artırma hizmetiyle bu eşiklere
                    daha kısa sürede ulaşabilirsiniz.
                  </p>
                  <p>
                    Türkiye'de Instagram kullanan 35 milyonun üzerinde aktif kullanıcı vardır ve
                    bu kitlenin dikkatini çekmek için güçlü bir profil şarttır. OptiSMM,
                    <strong className="text-foreground"> Türk takipçi</strong> seçeneğiyle yerel markaların ve
                    girişimcilerin hedef kitlesine doğrudan ulaşmasını kolaylaştırır.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ── SSS ── */}
          <div>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">Sık Sorulan Sorular</p>
              <h2 className="text-3xl font-bold font-display">Merak Ettikleriniz</h2>
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              {finalFaqItems.map(({ q, a }: any) => (
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

          {/* ── İlgili Blog Yazıları (SEO İç Bağlantı) ── */}
          {relatedPosts && relatedPosts.length > 0 && (
            <div className="border-t border-white/5 pt-16">
              <div className="text-center mb-10">
                <p className="text-xs uppercase tracking-[0.28em] text-primary/70 mb-3">BİLGİ BANKASI</p>
                <h2 className="text-3xl font-bold font-display">En Son İçerikler</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
                {relatedPosts.map((post) => {
                  const translations = post.translations as any;
                  const title = translations?.tr?.title || post.slug;
                  const description = translations?.tr?.excerpt || "";
                  
                  return (
                    <Link key={post.id} href={`/blog/${post.slug}`}>
                      <Card className="h-full border-white/10 bg-card/40 hover:bg-card/80 hover:border-white/20 transition-all cursor-pointer overflow-hidden group">
                        <CardContent className="p-6 flex flex-col h-full justify-between">
                          <div>
                            <h3 className="font-bold text-lg mb-3 group-hover:text-primary transition-colors line-clamp-2">
                              {title}
                            </h3>
                            {description && (
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                {description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center text-xs font-medium text-primary mt-4">
                            Makaleyi Oku <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CTA ── */}
          <div className="rounded-[2.5rem] border border-pink-500/30 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.2),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.8))] p-10 md:p-16 text-center shadow-2xl shadow-pink-500/10">
            <BadgeCheck size={40} className="text-pink-400 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">
              Hemen Başla, Farkı Hisset
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-7">
              OptiSMM'a ücretsiz kayıt ol, ilk siparişini ver ve Instagram büyümenin
              ne kadar hızlı olabileceğini gör. 7/24 destek her zaman yanında.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/instagram"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-pink-500/30 hover:opacity-90 transition-all text-base"
              >
                Takipçi Paketlerini İncele <ArrowRight size={20} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-white/20 bg-white/5 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"
              >
                <Clock size={16} /> 7/24 Destek
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
