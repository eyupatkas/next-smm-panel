import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

  return {
    rules: [
      // Genel tarayıcılar
      {
        userAgent: "*",
        allow: [
          "/",
          "/blog/",
          "/blog/feed.xml",
          "/services",
          "/servis-listesi/",
          "/contact",
          "/order-tracking",
          "/api-docs",
          "/tools/",
          "/legal/",
        ],
        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/error",
          "/_next/",
          "/forgot-password",
          "/login",
          "/signup",
          "/*?*session*",
          "/*?*token*",
          "/*?*utm_*",
          "/*?*ref=*",
          "/*?*fbclid=*",
          "/*?*gclid=*",
        ],
      },
      // Google: tam erişim
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/api/", "/error", "/_next/"],
      },
      // Bing: tam erişim
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/api/", "/error", "/_next/"],
      },
      // Yandex (RU pazarı için)
      {
        userAgent: "Yandex",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/api/", "/error", "/_next/"],
      },
      // DuckDuckGo
      {
        userAgent: "DuckDuckBot",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/api/", "/error", "/_next/"],
      },
      // AI arama botları: içerik görünürlüğü için izin ver
      {
        userAgent: "GPTBot",
        allow: ["/", "/blog/", "/services"],
        disallow: ["/admin/", "/dashboard/", "/api/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/blog/", "/services"],
        disallow: ["/admin/", "/dashboard/", "/api/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/blog/", "/services"],
        disallow: ["/admin/", "/dashboard/", "/api/"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/blog/", "/services"],
        disallow: ["/admin/", "/dashboard/", "/api/"],
      },
      // Sosyal medya önizleme botları
      {
        userAgent: "facebookexternalhit",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/api/"],
      },
      {
        userAgent: "Twitterbot",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/api/"],
      },
    ],
    host: baseUrl,
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/blog/feed.xml`, `${baseUrl}/sitemap-static.xml`, `${baseUrl}/sitemap-blog.xml`],
  };
}
