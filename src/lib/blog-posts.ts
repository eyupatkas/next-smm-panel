import { db } from "@/lib/db";

export type BlogTranslation = {
  title?: string;
  excerpt?: string;
  content?: string;
};

export type BlogTranslations = Record<string, BlogTranslation>;
export type BlogLangStatus = Record<string, "done" | "pending" | "error">;

export type SafeBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  published: boolean;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Çoklu dil desteği
  translations: BlogTranslations | null;
  langStatus: BlogLangStatus | null;
};

/** Locale'e göre post başlık/özet/içerik döndür (TR fallback ile) */
export function getLocalizedPost(
  post: SafeBlogPost,
  locale: string,
): { title: string; excerpt: string | null; content: string } {
  if (locale === "tr" || !locale) {
    return { title: post.title, excerpt: post.excerpt, content: post.content };
  }
  const t = post.translations?.[locale];
  return {
    title: t?.title || post.title,
    excerpt: t?.excerpt ?? post.excerpt,
    content: t?.content || post.content,
  };
}

/** Locale'e göre sadece meta alanlar (title + excerpt) döndür */
export function getLocalizedMeta(
  post: { title: string; excerpt?: string | null; translations?: BlogTranslations | null },
  locale: string,
): { title: string; excerpt: string | null } {
  if (locale === "tr" || !locale) {
    return { title: post.title, excerpt: post.excerpt ?? null };
  }
  const t = post.translations?.[locale];
  return {
    title: t?.title || post.title,
    excerpt: t?.excerpt ?? post.excerpt ?? null,
  };
}

type BlogWhere = Record<string, unknown>;
type BlogOrderBy = Array<Record<string, unknown>> | Record<string, unknown>;

function getBlogPostDelegate() {
  return (
    db as unknown as {
      blogPost?: {
        findMany: (args: { where?: BlogWhere; orderBy?: BlogOrderBy }) => Promise<SafeBlogPost[]>;
        findUnique: (args: {
          where: { slug?: string; id?: string };
          select?: Record<string, boolean>;
        }) => Promise<Partial<SafeBlogPost> | null>;
        findFirst: (args: { where: BlogWhere }) => Promise<SafeBlogPost | null>;
      };
    }
  ).blogPost;
}

export async function findPublishedBlogPosts() {
  const delegate = getBlogPostDelegate();
  if (!delegate?.findMany) return [] as SafeBlogPost[];

  try {
    return await delegate.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    });
  } catch {
    return [] as SafeBlogPost[];
  }
}

export async function findAllBlogPosts() {
  const delegate = getBlogPostDelegate();
  if (!delegate?.findMany) return [] as SafeBlogPost[];

  try {
    return await delegate.findMany({
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    });
  } catch {
    return [] as SafeBlogPost[];
  }
}

export async function findBlogPostBySlug(slug: string) {
  const delegate = getBlogPostDelegate();
  if (!delegate?.findFirst) return null;

  try {
    return await delegate.findFirst({ where: { slug, published: true } });
  } catch {
    return null;
  }
}

export async function findBlogPostMetaBySlug(slug: string) {
  const delegate = getBlogPostDelegate();
  if (!delegate?.findUnique) return null;

  try {
    return await delegate.findUnique({
      where: { slug },
      select: { title: true, excerpt: true, translations: true, coverImage: true, publishedAt: true, updatedAt: true },
    });
  } catch {
    return null;
  }
}

/**
 * Aynı tarihten yakın 4 yayınlanmış post döndür (basit ilişkili post öneri sistemi).
 * SEO için iç linkleme + dwell time artışı.
 */
export async function findRelatedBlogPosts(currentSlug: string, take: number = 4) {
  const delegate = getBlogPostDelegate();
  if (!delegate?.findMany) return [] as SafeBlogPost[];

  try {
    const all = await delegate.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    });
    return all.filter((p) => p.slug !== currentSlug).slice(0, take);
  } catch {
    return [] as SafeBlogPost[];
  }
}
