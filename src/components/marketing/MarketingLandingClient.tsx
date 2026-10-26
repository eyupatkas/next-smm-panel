"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Script from "next/script";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PackageShowcase, type MarketingPackage } from "@/components/marketing/PackageShowcase";
import {
  ArrowRight,
  Camera,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Globe2,
  MessageCircle,
  Play,
  ShieldCheck,
  ShoppingCart,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AIChatOrder } from "@/components/shared/AIChatOrder";

export function MarketingLandingClient({
  featuredPackages,
  stats,
}: {
  featuredPackages: MarketingPackage[];
  stats?: { serviceCount: number; orderCount: number; categoryCount: number; guaranteedCount: number };
}) {
  const t = useTranslations("home");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isChatActive, setIsChatActive] = useState(false);

  const faq = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OptiSMM",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: t("heroDesc"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  const services = [
    { icon: <Camera size={28} className="text-pink-400" />, title: t("instagramTitle"), desc: t("instagramDesc"), color: "from-pink-500/10 to-rose-500/5", border: "hover:border-pink-500/40 hover:shadow-pink-500/10", badge: `160+ ${t("servicesBadge")}` },
    { icon: <MessageCircle size={28} className="text-sky-400" />, title: t("twitterTitle"), desc: t("twitterDesc"), color: "from-sky-500/10 to-blue-500/5", border: "hover:border-sky-500/40 hover:shadow-sky-500/10", badge: `80+ ${t("servicesBadge")}` },
    { icon: <Play size={28} className="text-red-400" />, title: t("youtubeTitle"), desc: t("youtubeDesc"), color: "from-red-500/10 to-rose-500/5", border: "hover:border-red-500/40 hover:shadow-red-500/10", badge: `120+ ${t("servicesBadge")}` },
    { icon: <Zap size={28} className="text-teal-400" />, title: t("tiktokTitle"), desc: t("tiktokDesc"), color: "from-teal-500/10 to-cyan-500/5", border: "hover:border-teal-500/40 hover:shadow-teal-500/10", badge: `90+ ${t("servicesBadge")}` },
  ];

  const highlights = [
    { icon: ShieldCheck, title: t("h1Title"), desc: t("h1Desc"), color: "text-emerald-400", bg: "bg-emerald-500/15" },
    { icon: Zap, title: t("h2Title"), desc: t("h2Desc"), color: "text-yellow-400", bg: "bg-yellow-500/15" },
    { icon: Clock3, title: t("h3Title"), desc: t("h3Desc"), color: "text-sky-400", bg: "bg-sky-500/15" },
    { icon: ChartNoAxesCombined, title: t("h4Title"), desc: t("h4Desc"), color: "text-primary", bg: "bg-primary/15" },
  ];

  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}K+` : `${n}+`);
  const heroStats = [
    { label: t("statsOrders"), value: stats ? fmt(stats.orderCount) : t("statsOrdersVal"), icon: ShoppingCart, color: "text-primary" },
    { label: t("resellerStatServices"), value: stats ? fmt(stats.serviceCount) : t("statsCustomersVal"), icon: Users, color: "text-emerald-400" },
    { label: t("statsPlatforms"), value: stats ? fmt(stats.categoryCount) : t("statsPlatformsVal"), icon: Globe2, color: "text-sky-400" },
    { label: t("statsGuaranteed"), value: stats ? fmt(stats.guaranteedCount) : t("statsSatisfactionVal"), icon: ShieldCheck, color: "text-amber-400" },
  ];

  const securityItems = [t("security1"), t("security2"), t("security3"), t("security4")];

  const howSteps = [
    { step: t("how1Num"), title: t("how1Title"), desc: t("how1Desc"), num: "01" },
    { step: t("how2Num"), title: t("how2Title"), desc: t("how2Desc"), num: "02" },
    { step: t("how3Num"), title: t("how3Title"), desc: t("how3Desc"), num: "03" },
  ];

  const platformBadges = [
    { name: "Instagram", color: "bg-gradient-to-r from-pink-500 to-rose-500" },
    { name: "TikTok", color: "bg-gradient-to-r from-teal-500 to-cyan-500" },
    { name: "YouTube", color: "bg-gradient-to-r from-red-500 to-rose-600" },
    { name: "Twitter/X", color: "bg-gradient-to-r from-sky-500 to-blue-500" },
    { name: "Spotify", color: "bg-gradient-to-r from-green-500 to-emerald-500" },
    { name: "Telegram", color: "bg-gradient-to-r from-blue-400 to-sky-500" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Script id="marketing-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <Script id="faq-jsonld" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        })}
      </Script>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 lg:pt-40 md:pb-24">
        {/* Grid background */}
        <div className="absolute inset-0 z-0 bg-grid opacity-60" />
        {/* Gradient overlays + floating orbs */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.18),transparent)]" />
          <div className="absolute left-[8%] top-[22%] h-80 w-80 rounded-full bg-primary/10 blur-[90px] animate-float" style={{ animationDelay: "0s" }} />
          <div className="absolute right-[8%] top-[28%] h-64 w-64 rounded-full bg-sky-400/8 blur-[80px] animate-float" style={{ animationDelay: "2.5s" }} />
          <div className="absolute left-[45%] bottom-[8%] h-48 w-96 rounded-full bg-emerald-500/6 blur-[80px] animate-float" style={{ animationDelay: "4.5s" }} />
        </div>

        <div className="container relative z-10 mx-auto max-w-[1536px] px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Sol taraf: Bilgiler */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-6 text-left space-y-5"
            >
              {/* Live activity badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {t("badge")}
              </div>

              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl font-display">
                {t("heroTitle")} <br />
                <span className="gradient-text">{t("heroHighlight")}</span>
              </h1>
              
              <p className="text-base md:text-lg leading-relaxed text-muted-foreground max-w-xl">
                {t("heroDesc")}
              </p>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">{t("feature1")}</span>
                <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">{t("feature2")}</span>
                <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">{t("feature3")}</span>
                <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">{t("feature4")}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {platformBadges.map((p) => (
                  <span key={p.name} className={cn("rounded-full px-3 py-1 text-[11px] font-semibold text-white/90", p.color)}>
                    {p.name}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Sağ taraf: Yapay Zeka Sohbet Siparişi */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-6 w-full"
            >
              <AIChatOrder onChatActiveChange={setIsChatActive} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-border py-14">
        <div className="container mx-auto max-w-[1536px] px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {heroStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card-shine glass rounded-2xl p-6 text-center"
              >
                <div className={cn("mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40", stat.color)}>
                  <stat.icon size={20} />
                </div>
                <p className={cn("font-display text-3xl font-bold md:text-4xl", stat.color)}>{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured packages ── */}
      <section id="one-cikan-paketler" className="marketing-section lazy-section">
        <div className="container mx-auto max-w-[1536px] space-y-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">{t("featuredLabel")}</p>
            <h2 className="mt-3 text-4xl font-bold font-display md:text-5xl">{t("featuredTitle")}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">{t("featuredDesc")}</p>
          </div>
          <PackageShowcase
            packages={featuredPackages}
            emptyTitle={t("featuredEmpty")}
            emptyDescription={t("featuredEmptyDesc")}
            highlightPopular={false}
          />
        </div>
      </section>

      {/* ── Why us ── */}
      <section id="neden-biz" className="marketing-section lazy-section">
        <div className="container mx-auto max-w-[1536px]">
          <div className="mb-12 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">{t("whyLabel")}</p>
            <h2 className="mt-3 text-4xl font-bold font-display">{t("whyTitle")}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="card-shine h-full border-border/60 bg-gradient-to-br from-card to-card/70 shadow-xl transition-all duration-300 hover:border-primary/30 hover:shadow-2xl">
                  <CardContent className="p-8">
                    <div className={cn("mb-5 inline-flex rounded-2xl p-3", item.bg)}>
                      <item.icon size={24} className={item.color} />
                    </div>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="nasil-calisir" className="border-y border-border bg-white/[0.02] marketing-section lazy-section">
        <div className="container mx-auto max-w-[1536px]">
          <div className="mb-12 mx-auto max-w-3xl text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">{t("howLabel")}</p>
            <h2 className="mt-3 text-4xl font-bold font-display">{t("howTitle")}</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {howSteps.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="card-shine relative h-full overflow-hidden border-border/60 bg-background/80 shadow-xl">
                  <span className="absolute right-4 top-4 select-none font-display text-6xl font-black text-foreground/[0.03]">{item.num}</span>
                  <CardContent className="p-8">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
                      {item.step}
                    </div>
                    <h3 className="mt-2 text-2xl font-bold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platforms ── */}
      <section id="hizmetler" className="bg-background marketing-section lazy-section">
        <div className="container mx-auto max-w-[1536px]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }}
            className="mb-16 text-center"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-primary/80">{t("platformsLabel")}</p>
            <h2 className="mb-4 font-display text-3xl font-bold md:text-5xl">
              {t("platformsTitle")} <span className="gradient-text">{t("platformsTitleHighlight")}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">{t("platformsDesc")}</p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group cursor-pointer"
              >
                <Card className={cn(
                  "card-shine relative h-full overflow-hidden border-border/40 transition-all duration-300 hover:shadow-2xl",
                  service.border,
                  `bg-gradient-to-br ${service.color}`
                )}>
                  <CardContent className="p-8">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 transition-all duration-300 group-hover:scale-110">
                        {service.icon}
                      </div>
                      <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">{service.badge}</span>
                    </div>
                    <h3 className="mb-2 mt-4 text-xl font-bold">{service.title}</h3>
                    <p className="mb-4 text-sm text-muted-foreground">{service.desc}</p>
                    <div className="flex items-center text-xs font-semibold text-primary">
                      {t("detailsLink")} <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security + Reseller ── */}
      <section className="marketing-section">
        <div className="container mx-auto max-w-[1536px] grid gap-8 lg:grid-cols-2">
          <Card className="card-shine border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent shadow-2xl shadow-emerald-500/5">
            <CardContent className="p-10">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-400/80">{t("securityLabel")}</p>
              <h2 className="mt-4 font-display text-4xl font-bold">{t("securityTitle")}</h2>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {securityItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-sm">
                    <CheckCircle2 className="shrink-0 text-emerald-400" size={18} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="card-shine border-border/60 bg-gradient-to-br from-card to-card/70 shadow-2xl">
            <CardContent className="p-10">
              <p className="text-xs uppercase tracking-[0.24em] text-primary/80">{t("resellerLabel")}</p>
              <h3 className="mt-4 font-display text-3xl font-bold">{t("resellerTitle")}</h3>
              <div className="mt-6 space-y-4 text-sm leading-6 text-muted-foreground">
                <p>{t("resellerDesc")}</p>
                <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <Globe2 size={18} className="shrink-0 text-sky-400" /> {t("resellerApi")}
                </div>
              </div>
              <Link href="/signup" className={cn(buttonVariants({ variant: "default" }), "mt-6 w-full gap-2 rounded-xl")}>
                {t("resellerCTAApply")} <ArrowRight size={16} />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Reseller Full CTA ── */}
      <section id="bayi" className="border-y border-border bg-gradient-to-r from-primary/5 via-background to-primary/5 marketing-section">
        <div className="container mx-auto max-w-[1536px]">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge variant="outline" className="mb-4 rounded-full border-primary/20 text-primary">
                <TrendingUp size={12} className="mr-1.5" /> {t("resellerCTABadge")}
              </Badge>
              <h2 className="font-display text-4xl font-bold leading-tight">
                {t("resellerCTATitle1")}<br />
                <span className="gradient-text">{t("resellerCTATitle2")}</span>
              </h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                {t("resellerCTADesc")}
              </p>
              <div className="mt-8 space-y-3">
                {t("resellerCTAItems").split("|").map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className={cn(buttonVariants({ size: "lg", variant: "default" }), "gap-2 rounded-full px-8 shadow-lg shadow-primary/20")}>
                  {t("resellerCTAStart")} <ArrowRight size={16} />
                </Link>
                <Link href="/api-docs" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full border-border px-8")}>
                  {t("resellerCTAApiDocs")}
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: stats ? `${stats.serviceCount.toLocaleString("tr-TR")}+` : "15.000+", label: t("resellerStatServices"), color: "text-primary" },
                  { value: stats ? fmt(stats.orderCount) : t("statsOrdersVal"), label: t("statsOrders"), color: "text-emerald-400" },
                  { value: t("resellerStatDelivery"), label: t("resellerStatDeliveryLabel"), color: "text-sky-400" },
                  { value: "7/24", label: t("resellerStatSupport"), color: "text-amber-400" },
                ].map((stat) => (
                  <Card key={stat.label} className="card-shine border-border/60 bg-card">
                    <CardContent className="p-6 text-center">
                      <p className={cn("font-display text-3xl font-bold", stat.color)}>{stat.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* API terminal mock */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 font-mono text-xs text-slate-100 backdrop-blur">
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="ml-2 text-muted-foreground">OptiSMM API v2 — add order</span>
                </div>
                <div className="space-y-1">
                  <div><span className="text-blue-400">POST</span> <span className="text-white/60">/v2</span></div>
                  <div><span className="text-muted-foreground">  key:</span> <span className="text-amber-300">••••••••••••••••</span></div>
                  <div><span className="text-muted-foreground">  action:</span> <span className="text-green-400">add</span></div>
                  <div><span className="text-muted-foreground">  service:</span> <span className="text-amber-300">1042</span></div>
                  <div><span className="text-muted-foreground">  link:</span> <span className="text-white/80">instagram.com/p/…</span></div>
                  <div><span className="text-muted-foreground">  quantity:</span> <span className="text-amber-300">1000</span></div>
                  <div className="mt-2 text-emerald-400">✓ {"{ \"order\": 294801, \"status\": \"Processing\" }"}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ Accordion ── */}
      <section id="sss" className="border-t border-border marketing-section lazy-section">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">{t("faqLabel")}</p>
            <h2 className="mt-3 font-display text-4xl font-bold">{t("faqTitle")}</h2>
            <p className="mt-4 text-muted-foreground">{t("faqSubtitle")}</p>
          </div>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <div
                key={item.q}
                className={cn(
                  "rounded-2xl border transition-all duration-200",
                  openFaq === i
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 bg-gradient-to-br from-card to-card/70"
                )}
              >
                <button
                  className="flex w-full items-center justify-between p-6 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="font-semibold">{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform duration-200",
                      openFaq === i && "rotate-180 text-primary"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-sm leading-6 text-muted-foreground">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

