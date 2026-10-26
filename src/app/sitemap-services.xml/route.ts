import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicCategorySegment, publicServiceSegment } from "@/lib/public-service-slugs";
import { locales, defaultLocale } from "@/i18n/routing";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const dynamic = "force-dynamic";

function localeUrl(locale: string, path: string): string {
  const normalised = path === "/" ? "" : path;
  return locale === defaultLocale
    ? `${BASE}${normalised || "/"}`
    : `${BASE}/${locale}${normalised}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const pageNumber = page ? parseInt(page, 10) : 1;

  if (isNaN(pageNumber) || pageNumber < 1) {
    return new NextResponse("Invalid Page", { status: 400 });
  }

  const take = 3000;
  const skip = (pageNumber - 1) * take;

  const services = await db.service.findMany({
    where: { status: true },
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    skip,
    take,
  });

  if (services.length === 0 && pageNumber > 1) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const categoryPages = new Map<string, string>();
  const urls: string[] = [];

  for (const service of services) {
    const category = service.category;
    if (!category) continue;
    
    const parent = category.parent ?? category;
    const categorySlug = category.parent ? publicCategorySegment(category) : publicCategorySegment(parent);
    const parentSlug = publicCategorySegment(parent);

    const catPath = `/servis-listesi/${parentSlug}/${categorySlug}`;
    if (!categoryPages.has(catPath)) {
      categoryPages.set(catPath, service.updatedAt.toISOString());
    }
  }

  if (pageNumber === 1) {
    for (const [catPath, lastmodIso] of categoryPages) {
      const lastmod = lastmodIso.split("T")[0];
      for (const locale of locales) {
        const adjustedPriority = locale === defaultLocale ? "0.72" : "0.67";
        const loc = localeUrl(locale, catPath);
        
        const hreflangs = locales.map((l) => {
          return `    <xhtml:link rel="alternate" hreflang="${l}" href="${localeUrl(l, catPath)}" />`;
        });
        hreflangs.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(defaultLocale, catPath)}" />`);

        urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${adjustedPriority}</priority>
${hreflangs.join("\n")}
  </url>`);
      }
    }

    try {
      const rootCategories = await db.category.findMany({
        where: { parentId: null, status: true },
        select: { slug: true, updatedAt: true },
      });
      
      for (const cat of rootCategories) {
        const path = `/${cat.slug}`;
        for (const locale of locales) {
          const adjustedPriority = locale === defaultLocale ? "0.85" : "0.80";
          const loc = localeUrl(locale, path);
          
          const hreflangs = locales.map((l) => {
            return `    <xhtml:link rel="alternate" hreflang="${l}" href="${localeUrl(l, path)}" />`;
          });
          hreflangs.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(defaultLocale, path)}" />`);

          urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${cat.updatedAt.toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${adjustedPriority}</priority>
${hreflangs.join("\n")}
  </url>`);
        }
      }

      const subCategories = await db.category.findMany({
        where: { parentId: { not: null }, status: true },
        select: { slug: true, updatedAt: true, parent: { select: { slug: true } } },
      });
      
      for (const s of subCategories) {
        if (!s.parent) continue;
        const path = `/${s.parent.slug}/${s.slug}`;
        for (const locale of locales) {
          const adjustedPriority = locale === defaultLocale ? "0.75" : "0.70";
          const loc = localeUrl(locale, path);
          
          const hreflangs = locales.map((l) => {
            return `    <xhtml:link rel="alternate" hreflang="${l}" href="${localeUrl(l, path)}" />`;
          });
          hreflangs.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(defaultLocale, path)}" />`);

          urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${s.updatedAt.toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${adjustedPriority}</priority>
${hreflangs.join("\n")}
  </url>`);
        }
      }
    } catch {
      // ignore
    }
  }

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
