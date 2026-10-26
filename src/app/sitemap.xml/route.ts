import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  const servicesSitemaps = `  <sitemap>
    <loc>${BASE}/sitemap-services.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE}/sitemap-static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE}/sitemap-blog.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE}/sitemap-landing.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
${servicesSitemaps}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
