import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { auth } from "@/auth";
import { BrandMark } from "@/components/shared/BrandMark";
import { MessageCircle, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AnalyticsTracker } from "@/components/shared/AnalyticsTracker";
import { getSettings } from "@/lib/settings";
import { ExitIntentPopup } from "@/components/marketing/ExitIntentPopup";
import { StickyCTABar } from "@/components/marketing/StickyCTABar";
import { SocialProofTicker } from "@/components/marketing/SocialProofTicker";

export const metadata: Metadata = {
  title: {
    default: "OptiSMM | Sosyal Medya Büyütme ve Bayi Paneli",
    template: "%s | OptiSMM",
  },
  description:
    "Instagram takipçi, TikTok beğeni, YouTube abone ve daha fazlası için güvenilir SMM panel. Hızlı teslimat, bayi altyapısı, güvenli ödeme ve 7/24 destek.",
  openGraph: {
    title: "OptiSMM | Sosyal Medya Büyütme ve Bayi Paneli",
    description:
      "Instagram, TikTok, YouTube ve Twitter için güvenilir sosyal medya büyütme hizmetleri. Hızlı teslimat, güvenli ödeme, bayi altyapısı.",
    type: "website",
    locale: "tr_TR",
    siteName: "OptiSMM",
    // images: opengraph-image.tsx convention otomatik inject ediyor
  },
  twitter: {
    card: "summary_large_image",
    title: "OptiSMM | Sosyal Medya Büyütme ve Bayi Paneli",
    description:
      "Instagram takipçi, TikTok beğeni, YouTube abone hizmetleri. 7/24 destek, anında başlangıç, bayi altyapısı.",
    // images: opengraph-image.tsx convention otomatik inject ediyor
  },
};

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth().catch(() => null);
  const t = await getTranslations("footer");
  const navT = await getTranslations("nav");
  const siteSettings = await getSettings(["whatsapp_button_enabled"]);
  const showWhatsApp = siteSettings.whatsapp_button_enabled !== "0";
  const user = session?.user
    ? { name: session.user.name, role: session.user.role, image: session.user.image }
    : null;

  return (
    <div className="relative min-h-screen">
      <AnalyticsTracker isAdmin={user?.role === "ADMIN"} />
      <Navbar user={user} />
      <main className="flex-1">{children}</main>
      
      {/* ── FOOTER ── */}
      <footer
        className="border-t border-border bg-muted/30 dark:bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.07),transparent_40%),linear-gradient(180deg,rgba(2,6,23,0.98)_0%,rgba(2,6,23,1)_100%)]"
        role="contentinfo"
      >
        {/* Main grid */}
        <div className="container mx-auto max-w-[1536px] px-6 lg:px-8 pt-14 pb-24 sm:pb-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 xl:grid-cols-4 xl:gap-x-12">

            {/* ── Col 1: Brand (full-width on mobile) ── */}
            <div className="col-span-1 flex flex-col rounded-2xl border border-border bg-card/60 p-5 sm:col-span-2 sm:border-0 sm:bg-transparent sm:p-0 xl:col-span-1">
              <BrandMark size="md" showTagline />
              <p className="mt-4 text-sm leading-7 text-muted-foreground max-w-xs">
                {t("description")}
              </p>
              {showWhatsApp && (
                <a
                  href="https://wa.me/908503055213"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-green-500/25 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/20 hover:text-green-300 transition-all"
                >
                  <MessageCircle size={15} />
                  +90 850 305 52 13
                </a>
              )}
              {/* Açık Adres ve Telefon Bilgileri */}
              <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground/90">
                {t("address") && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t("address"))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 hover:text-foreground transition-colors group/addr max-w-xs"
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0 text-amber-500/80 group-hover/addr:text-amber-400 transition-colors" />
                    <span>{t("address")}</span>
                  </a>
                )}
                {t("phone") && (
                  <a
                    href="tel:+908503055213"
                    className="flex items-center gap-2 hover:text-foreground transition-colors group/phone"
                  >
                    <Phone size={14} className="shrink-0 text-blue-500/80 group-hover/phone:text-blue-400 transition-colors" />
                    <span>{t("phone")}</span>
                  </a>
                )}
              </div>
              {/* Featured SEO pills */}
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  { href: "/instagram-takipci-satin-al", label: t("seoInstagram"), icon: "📸" },
                  { href: "/tiktok-takipci-satin-al", label: t("seoTikTok"), icon: "🎵" },
                  { href: "/youtube-abone-satin-al", label: t("seoYouTube"), icon: "▶️" },
                  { href: "/smm-panel", label: t("seoSmmPanel"), icon: "⚡" },
                  { href: "/bayilik", label: t("seoReseller"), icon: "🤝" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href as Parameters<typeof Link>[0]["href"]}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium border border-border bg-card/80 px-3 py-1.5 rounded-full hover:border-primary/30 hover:bg-primary/8 hover:text-primary transition-all"
                  >
                    <span>{l.icon}</span> {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* ── Col 2: Platformlar ── */}
            <div className="col-span-1 rounded-2xl border border-border bg-card/60 p-5 sm:border-0 sm:bg-transparent sm:p-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/60 mb-4">{t("platforms")}</p>
              <nav className="space-y-2.5" aria-label="Platform navigasyon">
                {[
                  { href: "/instagram", label: "Instagram", dot: "bg-gradient-to-br from-pink-500 to-purple-600" },
                  { href: "/tiktok", label: "TikTok", dot: "bg-gradient-to-br from-slate-800 to-rose-500" },
                  { href: "/youtube", label: "YouTube", dot: "bg-red-500" },
                  { href: "/twitter", label: "Twitter / X", dot: "bg-sky-500" },
                  { href: "/facebook", label: "Facebook", dot: "bg-blue-600" },
                  { href: "/telegram", label: "Telegram", dot: "bg-cyan-500" },
                  { href: "/spotify", label: "Spotify", dot: "bg-green-500" },
                  { href: "/twitch", label: "Twitch", dot: "bg-purple-600" },
                  { href: "/discord", label: "Discord", dot: "bg-indigo-500" },
                  { href: "/linkedin", label: "LinkedIn", dot: "bg-blue-700" },
                ].map((p) => (
                  <Link
                    key={p.href}
                    href={p.href as Parameters<typeof Link>[0]["href"]}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    {p.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* ── Col 3: Hizmetler ── */}
            <div className="col-span-1 rounded-2xl border border-border bg-card/60 p-5 sm:border-0 sm:bg-transparent sm:p-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/60 mb-4">{t("quickAccess")}</p>
              <nav className="space-y-2.5" aria-label="Footer navigasyon">
                {[
                  { href: "/services", label: t("services") },
                  { href: "/servis-listesi", label: navT("servicesList") },
                  { href: "/ai-order", label: navT("aiOrder") },
                  { href: "/order-tracking", label: navT("orderTracking") },
                  { href: "/bayilik", label: navT("reseller") },
                  { href: "/blog", label: t("blog") },
                  { href: "/contact", label: t("contact") },
                  { href: "/api-docs", label: t("apiDoc") },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href as Parameters<typeof Link>[0]["href"]}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* ── Col 4: Araçlar + Yasal ── */}
            <div className="col-span-1 rounded-2xl border border-border bg-card/60 p-5 sm:border-0 sm:bg-transparent sm:p-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/60 mb-4">{t("legal")}</p>
              <nav className="space-y-2.5 mb-8" aria-label="Yasal sayfalar">
                {[
                  { href: "/legal/terms", label: t("terms") },
                  { href: "/legal/privacy", label: t("privacy") },
                  { href: "/legal/kvkk", label: t("kvkk") },
                  { href: "/legal/refund", label: t("refund") },
                  { href: "/legal/cookies", label: t("cookies") },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href as Parameters<typeof Link>[0]["href"]}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/60 mb-4">Araçlar</p>
              <nav className="space-y-2.5" aria-label="Araçlar">
                {[
                  { href: "/tools/instagram-hashtag-generator", label: t("hashtag") },
                  { href: "/tools/social-media-post-planner", label: "Post Planlayıcı" },
                  { href: "/tools/character-counter", label: t("charCounter") },
                  { href: "/tools/engagement-rate-calculator", label: t("engCalc") },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href as Parameters<typeof Link>[0]["href"]}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-border">
          <div className="container mx-auto max-w-[1536px] flex flex-col gap-2 px-6 lg:px-8 py-5 text-center text-xs text-muted-foreground/60 sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p className="shrink-0">© {new Date().getFullYear()} OptiSMM — {t("allRightsReserved")}</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}

      {/* ── Dönüşüm / Conversion Widgets ── */}
      <ExitIntentPopup />
      <StickyCTABar />
      <SocialProofTicker />
    </div>
  );
}
