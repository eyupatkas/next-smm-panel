import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { findBlogPostBySlug, findBlogPostMetaBySlug, getLocalizedPost, getLocalizedMeta, findRelatedBlogPosts } from "@/lib/blog-posts";
import { ArrowLeft } from "lucide-react";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { RelatedPosts } from "@/components/marketing/RelatedPosts";

// 5 dakikada bir yeniden üret (ISR) — force-dynamic'den daha CWV-dostu
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = await findBlogPostMetaBySlug(slug);
  if (!post) {
    return { title: "Blog | OptiSMM" };
  }

  const { title, excerpt } = getLocalizedMeta(
    { title: post.title ?? "", excerpt: post.excerpt, translations: post.translations },
    locale,
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";
  const coverUrl = post.coverImage
    ? (post.coverImage.startsWith("http") ? post.coverImage : `${siteUrl}${post.coverImage}`)
    : `${siteUrl}/images/blog-default-banner.svg`;

  const canonicalPath = locale === "tr" ? `/blog/${slug}` : `/${locale}/blog/${slug}`;
  const ogLocale = locale === "zh" ? "zh_CN" : locale === "pt" ? "pt_BR" : `${locale}_${locale.toUpperCase()}`;

  // hreflang alternateleri
  const allLocales = ["tr", "en", "de", "ar", "zh", "fr", "es", "ru", "pt", "ja", "ko", "it"];
  const languages: Record<string, string> = {};
  for (const l of allLocales) {
    languages[l] = l === "tr" ? `${siteUrl}/blog/${slug}` : `${siteUrl}/${l}/blog/${slug}`;
  }
  languages["x-default"] = `${siteUrl}/blog/${slug}`;

  return {
    title: `${title} | OptiSMM Blog`,
    description: excerpt || undefined,
    openGraph: {
      title: title ?? undefined,
      description: excerpt || undefined,
      type: "article",
      locale: ogLocale,
      siteName: "OptiSMM",
      url: `${siteUrl}${canonicalPath}`,
      images: [{ url: coverUrl, width: 1200, height: 630, alt: title ?? "" }],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: [`${siteUrl}`],
      section: "Blog",
    },
    twitter: {
      card: "summary_large_image",
      site: "@optismm",
      title: title ?? undefined,
      description: excerpt || undefined,
      images: [coverUrl],
    },
    alternates: {
      canonical: `${siteUrl}${canonicalPath}`,
      languages,
      types: {
        "application/rss+xml": [
          {
            url: locale === "tr" ? "/blog/feed.xml" : `/${locale}/blog/feed.xml`,
            title: "OptiSMM Blog RSS",
          },
        ],
      },
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, locale } = await params;
  const post = await findBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Yerelleştirilmiş içerik
  const localized = getLocalizedPost(post, locale);
  const displayTitle = localized.title;
  const displayExcerpt = localized.excerpt;
  const displayContent = localized.content;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";
  const coverUrl = post.coverImage
    ? (post.coverImage.startsWith("http") ? post.coverImage : `${siteUrl}${post.coverImage}`)
    : `${siteUrl}/images/blog-default-banner.svg`;
  const wordCount = displayContent.split(/\s+/).length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));
  const canonicalPath = locale === "tr" ? `/blog/${slug}` : `/${locale}/blog/${slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${siteUrl}${canonicalPath}/#article`,
    headline: displayTitle,
    description: displayExcerpt || displayContent.slice(0, 160),
    image: { "@type": "ImageObject", url: coverUrl, width: 1200, height: 630 },
    url: `${siteUrl}${canonicalPath}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}${canonicalPath}` },
    datePublished: (post.publishedAt || post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    wordCount,
    timeRequired: `PT${readingTimeMin}M`,
    author: {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "OptiSMM",
      url: siteUrl,
      logo: { "@type": "ImageObject", url: `${siteUrl}/icon.svg` },
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "OptiSMM",
      logo: { "@type": "ImageObject", url: `${siteUrl}/icon.svg` },
    },
    inLanguage: locale,
    isPartOf: { "@type": "Blog", "@id": `${siteUrl}/blog`, name: "OptiSMM Blog" },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: displayTitle, item: `${siteUrl}${canonicalPath}` },
    ],
  };

  const relatedPosts = await findRelatedBlogPosts(slug, 4);
  const blogHref = locale === "tr" ? "/blog" : `/${locale}/blog`;

  return (
    <article className="min-h-screen bg-background pt-28 pb-20">
      <Script id="article-jsonld" type="application/ld+json">
        {JSON.stringify(articleJsonLd)}
      </Script>
      <Script id="article-breadcrumb-jsonld" type="application/ld+json">
        {JSON.stringify(breadcrumbJsonLd)}
      </Script>
      <div className="container mx-auto max-w-4xl px-4">
        <Breadcrumbs
          locale={locale}
          withJsonLd={false}
          className="mb-6"
          items={[
            { label: "Blog", href: "/blog" },
            { label: displayTitle },
          ]}
        />
        <Link href={blogHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft size={16} /> Blog&apos;a Dön
        </Link>
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80">OptiSMM Blog</p>
        <h1 className="mt-3 text-5xl font-bold font-display leading-tight">{displayTitle}</h1>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <time dateTime={(post.publishedAt || post.createdAt).toISOString()}>
            {new Date(post.publishedAt || post.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          <span>{readingTimeMin} min read</span>
        </div>
        {displayExcerpt && <p className="mt-6 text-lg leading-8 text-muted-foreground">{displayExcerpt}</p>}
        <div className="mt-8 rounded-3xl overflow-hidden border border-white/10">
          { }
          <img
            src={post.coverImage || "/images/blog-default-banner.svg"}
            alt={displayTitle}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="w-full h-72 object-cover"
          />
        </div>
        <div 
          className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 text-base leading-8 text-foreground/90 blog-content-rich"
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />
        <div className="mt-10 border-t border-white/10 pt-8">
          <Link href={blogHref} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft size={16} /> Tüm yazıları gör
          </Link>
        </div>
        <RelatedPosts currentSlug={slug} locale={locale} preloaded={relatedPosts} />
      </div>
    </article>
  );
}
