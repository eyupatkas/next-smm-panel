import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { findRelatedBlogPosts, getLocalizedMeta, type SafeBlogPost } from "@/lib/blog-posts";

type Props = {
  currentSlug: string;
  locale: string;
  /** Server-side fetch yerine önceden hesaplanmış postları kullanmak için */
  preloaded?: SafeBlogPost[];
};

/**
 * İlgili Blog Yazıları widget'ı. Server component.
 * SEO için iç linkleme yoğunluğunu artırır ve dwell time'ı uzatır.
 */
export async function RelatedPosts({ currentSlug, locale, preloaded }: Props) {
  const posts = preloaded ?? (await findRelatedBlogPosts(currentSlug, 4));
  if (!posts || posts.length === 0) return null;

  const blogBase = locale === "tr" ? "/blog" : `/${locale}/blog`;

  return (
    <section aria-label="İlgili yazılar" className="mt-16 border-t border-white/10 pt-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-display">İlgili Rehberler</h2>
        <Link
          href={blogBase}
          className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
          Tümünü gör <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => {
          const { title, excerpt } = getLocalizedMeta(
            { title: post.title, excerpt: post.excerpt, translations: post.translations },
            locale,
          );
          return (
            <Link
              key={post.id}
              href={`${blogBase}/${post.slug}`}
              className="group"
            >
              <Card className="h-full overflow-hidden border-white/10 bg-card/70 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
                <div className="overflow-hidden">
                  { }
                  <img
                    src={post.coverImage || "/images/blog-default-banner.svg"}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  {excerpt && (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-2">
                      {excerpt}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default RelatedPosts;
