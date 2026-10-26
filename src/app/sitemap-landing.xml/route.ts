import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { locales, defaultLocale } from "@/i18n/routing";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const dynamic = "force-dynamic";

function localeUrl(locale: string, path: string): string {
  const normalised = path === "/" ? "" : path;
  return locale === defaultLocale
    ? `${BASE}${normalised || "/"}`
    : `${BASE}/${locale}${normalised}`;
}

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  let landingPages: { slug: string; updatedAt: Date | null }[] = [];
  try {
    landingPages = await (db as any).landingPage.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
  } catch (error) {
    console.error("Error fetching landing pages for sitemap:", error);
  }

  const urls = landingPages.map((page) => {
    const route = `/${page.slug}`;
    const date = page.updatedAt ? page.updatedAt.toISOString().split("T")[0] : today;

    const links = locales
      .map((loc) => `<xhtml:link rel="alternate" hreflang="${loc}" href="${localeUrl(loc, route)}" />`)
      .join("\n      ");
      
    const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(defaultLocale, route)}" />`;

    return `  <url>
    <loc>${localeUrl(defaultLocale, route)}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    ${links}
    ${xDefault}
  </url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
