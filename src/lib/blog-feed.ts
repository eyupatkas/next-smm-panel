import { findPublishedBlogPosts, getLocalizedMeta } from "@/lib/blog-posts";
import { SITE_URL } from "@/lib/seo";
import { defaultLocale, locales } from "@/i18n/routing";

export const dynamic = "force-dynamic";
// 1 saatte bir yeniden üret
export const revalidate = 3600;

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * RSS 2.0 + Atom self-link uyumlu blog feed.
 * Locale parametresi opsiyonel; verilmezse defaultLocale (tr) kullanılır.
 */
export async function buildBlogFeed(locale: string = defaultLocale): Promise<string> {
  const lang = locales.includes(locale as (typeof locales)[number]) ? locale : defaultLocale;
  const posts = await findPublishedBlogPosts();
  const blogPath = lang === defaultLocale ? "/blog" : `/${lang}/blog`;
  const feedUrl = lang === defaultLocale
    ? `${SITE_URL}/blog/feed.xml`
    : `${SITE_URL}/${lang}/blog/feed.xml`;
  const now = new Date();
  const lastBuild = posts[0]?.publishedAt ?? posts[0]?.updatedAt ?? now;

  const items = posts.slice(0, 50).map((post) => {
    const { title, excerpt } = getLocalizedMeta(
      { title: post.title, excerpt: post.excerpt, translations: post.translations },
      lang,
    );
    const url = `${SITE_URL}${blogPath}/${post.slug}`;
    const pubDate = (post.publishedAt ?? post.createdAt).toUTCString();
    const description = excerpt ? stripHtml(excerpt) : stripHtml(post.content).slice(0, 280);

    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>${
        post.coverImage
          ? `\n      <enclosure url="${escapeXml(
              post.coverImage.startsWith("http") ? post.coverImage : `${SITE_URL}${post.coverImage}`,
            )}" type="image/jpeg" length="0" />`
          : ""
      }
      <dc:creator>OptiSMM</dc:creator>
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>OptiSMM Blog</title>
    <link>${SITE_URL}${blogPath}</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <description>Sosyal medya büyütme rehberleri, Instagram, TikTok, YouTube stratejileri ve SMM panel ipuçları.</description>
    <language>${lang}</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <generator>Next.js (OptiSMM)</generator>
    <ttl>60</ttl>
    <image>
      <url>${SITE_URL}/icon.svg</url>
      <title>OptiSMM Blog</title>
      <link>${SITE_URL}${blogPath}</link>
    </image>
${items}
  </channel>
</rss>`;
}
