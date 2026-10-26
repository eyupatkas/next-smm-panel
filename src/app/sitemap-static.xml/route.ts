import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/i18n/routing";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const dynamic = "force-static";
export const revalidate = 86400;

function localeUrl(locale: string, path: string): string {
  const normalised = path === "/" ? "" : path;
  return locale === defaultLocale
    ? `${BASE}${normalised || "/"}`
    : `${BASE}/${locale}${normalised}`;
}

interface PageDef {
  path: string;
  changeFreq: string;
  priority: string;
}

const PAGES: PageDef[] = [
  { path: "/", changeFreq: "daily", priority: "1.0" },
  { path: "/services", changeFreq: "daily", priority: "0.95" },
  { path: "/servis-listesi", changeFreq: "daily", priority: "0.90" },
  { path: "/blog", changeFreq: "daily", priority: "0.85" },
  { path: "/contact", changeFreq: "monthly", priority: "0.60" },
  { path: "/order-tracking", changeFreq: "monthly", priority: "0.40" },
  { path: "/api-docs", changeFreq: "weekly", priority: "0.50" },
  { path: "/smm-panel", changeFreq: "weekly", priority: "0.92" },
  { path: "/bayilik", changeFreq: "monthly", priority: "0.88" },
  { path: "/instagram-takipci-satin-al", changeFreq: "weekly", priority: "0.92" },
  { path: "/instagram-begeni-satin-al", changeFreq: "weekly", priority: "0.90" },
  { path: "/instagram-turk-takipci-satin-al", changeFreq: "weekly", priority: "0.90" },
  { path: "/tiktok-takipci-satin-al", changeFreq: "weekly", priority: "0.90" },
  { path: "/tiktok-begeni-satin-al", changeFreq: "weekly", priority: "0.88" },
  { path: "/youtube-abone-satin-al", changeFreq: "weekly", priority: "0.88" },
  { path: "/instagram-izlenme-satin-al", changeFreq: "weekly", priority: "0.85" },
  { path: "/instagram-reels-izlenme-satin-al", changeFreq: "weekly", priority: "0.85" },
  { path: "/instagram-yorum-satin-al", changeFreq: "weekly", priority: "0.82" },
  { path: "/tiktok-izlenme-satin-al", changeFreq: "weekly", priority: "0.82" },
  { path: "/twitter-takipci-satin-al", changeFreq: "weekly", priority: "0.82" },
  { path: "/instagram-organik-takipci-satin-al", changeFreq: "weekly", priority: "0.82" },
  { path: "/instagram-dusmeyen-takipci-satin-al", changeFreq: "weekly", priority: "0.82" },
  { path: "/tools/instagram-hashtag-generator", changeFreq: "monthly", priority: "0.55" },
  { path: "/tools/social-media-post-planner", changeFreq: "monthly", priority: "0.55" },
  { path: "/tools/character-counter", changeFreq: "monthly", priority: "0.50" },
  { path: "/tools/instagram-font-generator", changeFreq: "monthly", priority: "0.50" },
  { path: "/tools/engagement-rate-calculator", changeFreq: "monthly", priority: "0.55" },
  { path: "/legal/terms", changeFreq: "yearly", priority: "0.20" },
  { path: "/legal/privacy", changeFreq: "yearly", priority: "0.20" },
  { path: "/legal/kvkk", changeFreq: "yearly", priority: "0.20" },
  { path: "/legal/refund", changeFreq: "yearly", priority: "0.20" },
  { path: "/legal/cookies", changeFreq: "yearly", priority: "0.20" },
];

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  const urls = PAGES.flatMap((page) =>
    locales.map((locale) => {
      const adjustedPriority =
        locale === defaultLocale ? page.priority : String(Math.max(Number(page.priority) - 0.05, 0.1));
      
      const loc = localeUrl(locale, page.path);
      
      const hreflangs = locales.map((l) => {
        return `    <xhtml:link rel="alternate" hreflang="${l}" href="${localeUrl(l, page.path)}" />`;
      });
      hreflangs.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(defaultLocale, page.path)}" />`);

      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changeFreq}</changefreq>
    <priority>${adjustedPriority}</priority>
${hreflangs.join("\n")}
  </url>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
