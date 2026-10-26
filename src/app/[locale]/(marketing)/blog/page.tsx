import type { Metadata } from "next";
import { canonicalUrl, hreflangAlternates } from "@/lib/seo";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { findPublishedBlogPosts, getLocalizedPost } from "@/lib/blog-posts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BookOpen } from "lucide-react";

// ISR: 5 dakika cache
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const path = "/blog";
  return {
    title: "Blog | OptiSMM SMM Panel",
    description: "Instagram takipçi artırma, TikTok viral stratejiler, YouTube büyütme ve SMM panel rehberleri. Sosyal medya büyütme için güncel ipuçları.",
    keywords: [
      "sosyal medya büyütme blog",
      "instagram büyütme rehberi",
      "tiktok viral olma",
      "youtube abone artırma",
      "smm panel rehberi",
      "sosyal medya stratejileri",
    ],
    openGraph: {
      type: "website",
      siteName: "OptiSMM",
      title: "Blog | OptiSMM SMM Panel",
      description: "Sosyal medya büyütme stratejileri, Instagram, TikTok and YouTube rehberleri.",
    },
    twitter: {
      card: "summary_large_image",
      site: "@optismm",
      title: "Blog | OptiSMM SMM Panel",
      description: "Sosyal medya büyütme stratejileri.",
    },
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: hreflangAlternates(path),
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

export default async function BlogPage() {
  const locale = await getLocale();
  let posts = await findPublishedBlogPosts();

  if (!Array.isArray(posts)) {
    posts = [];
  }

  // Her yazının yerelleştirilmiş versiyonunu al
  const localizedPosts = posts.map((post) => ({
    ...post,
    ...getLocalizedPost(post, locale),
  }));

  const featured = localizedPosts.find((post) => post.featured) ?? localizedPosts[0] ?? null;
  const rest = featured ? localizedPosts.filter((post) => post.id !== featured.id) : [];

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-4 space-y-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <BookOpen size={20} />
            </div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Blog</p>
          </div>
          <h1 className="text-5xl font-bold font-display">Sosyal Medya Büyütme Rehberleri</h1>
          <p className="mt-4 text-muted-foreground text-lg">
            SEO, Instagram büyütme, TikTok stratejileri, YouTube abone artırma ve SMM panel kullanım rehberleri.
          </p>
        </div>

        {featured && (
          <Link href={`/blog/${featured.slug}`} className="block group">
            <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-primary/10 to-transparent shadow-2xl transition-all group-hover:-translate-y-1 group-hover:shadow-primary/20">
              <CardContent className="grid gap-6 p-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
                <div>
                  <Badge variant="outline" className="mb-3">Öne Çıkan</Badge>
                  <h2 className="text-3xl font-bold leading-tight">{featured.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{featured.excerpt || featured.content.slice(0, 220)}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                    Devamını oku <ArrowRight size={16} />
                  </span>
                </div>
                <div className="rounded-3xl overflow-hidden border border-white/10">
                  <img
                    src={featured.coverImage || "/images/blog-default-banner.svg"}
                    alt={featured.title}
                    className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {rest.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                <Card className="h-full border-white/10 bg-gradient-to-br from-card to-card/70 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-primary/30 overflow-hidden">
                  <div className="overflow-hidden">
                    <img
                      src={post.coverImage || "/images/blog-default-banner.svg"}
                      alt={post.title}
                      className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <time dateTime={(post.publishedAt || post.createdAt).toISOString()}>
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                      {post.featured && <Badge variant="outline">Öne Çıkan</Badge>}
                    </div>
                    <h3 className="mt-4 text-2xl font-bold leading-tight group-hover:text-primary transition-colors">{post.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{post.excerpt || post.content.slice(0, 180)}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Oku <ArrowRight size={14} />
                    </span>
                  </CardContent>
                </Card>

              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 && (
          <Card className="border-white/10 shadow-xl">
            <CardContent className="p-12 text-center">
              <BookOpen size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-bold">Henüz blog yazısı yok</h3>
              <p className="mt-2 text-sm text-muted-foreground">Yakında sosyal medya büyütme rehberlerimiz burada yayınlanacak.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
