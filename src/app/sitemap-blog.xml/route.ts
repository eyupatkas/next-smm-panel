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
  const posts = await db.blogPost.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });

  const urls = posts.flatMap((post) =>
    locales.map((locale) => {
      const adjustedPriority = locale === defaultLocale ? "0.70" : "0.65";
      const path = `/blog/${post.slug}`;
      const loc = localeUrl(locale, path);
      
      const hreflangs = locales.map((l) => {
        return `    <xhtml:link rel="alternate" hreflang="${l}" href="${localeUrl(l, path)}" />`;
      });
      hreflangs.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(defaultLocale, path)}" />`);

      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${post.updatedAt.toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
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
