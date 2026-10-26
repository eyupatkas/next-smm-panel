"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { setSettings } from "@/lib/settings";
import {
  generateBlogContent,
  generateTopicSuggestions,
  getBlogAISettings,
  runAutoBlogPost,
  translateSinglePost,
} from "@/lib/services/blog-ai";
import { BLOG_TRANSLATE_LANGS } from "@/lib/blog-constants";
import type { BlogLangStatus, BlogTranslations } from "@/lib/blog-posts";
import type { Session } from "next-auth";

function ensureAdmin(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Blog AI ayarlarını kaydet
export async function saveBlogAISettings(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const values = {
    blog_ai_api_key: String(formData.get("blog_ai_api_key") || ""),
    blog_ai_model: String(formData.get("blog_ai_model") || "gemini-3.8-flash"),
    blog_ai_enabled: formData.get("blog_ai_enabled") === "on" ? "1" : "0",
    blog_ai_auto_post_interval: String(formData.get("blog_ai_auto_post_interval") || "off"),
  };

  await setSettings(values);
  revalidatePath("/admin/blog");
}

// AI ile tek blog yazısı üret
export async function generateBlogPostAI(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const topic = String(formData.get("topic") || "").trim();
  const autoPublish = formData.get("autoPublish") === "on";

  if (!topic) return { error: "Konu belirtilmedi." };

  try {
    const content = await generateBlogContent(topic);

    const baseSlug = slugify(content.title);
    const existing = await db.blogPost.count({ where: { slug: { startsWith: baseSlug } } });
    const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;

    // Tüm hedef dilleri çeviri kuyruğuna al
    const initialLangStatus: BlogLangStatus = Object.fromEntries(
      BLOG_TRANSLATE_LANGS.map((l) => [l, "pending"]),
    );

    await db.blogPost.create({
      data: {
        title: content.title,
        slug,
        excerpt: content.excerpt,
        content: content.content,
        published: autoPublish,
        featured: false,
        publishedAt: autoPublish ? new Date() : null,
        langStatus: initialLangStatus as never,
        translations: {} as never,
      },
    });

    revalidatePath("/admin/blog");
    revalidatePath("/blog");

    return { success: `"${content.title}" blog yazısı ${autoPublish ? "yayınlandı" : "taslak olarak oluşturuldu"}.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI içerik üretme hatası." };
  }
}

// Konu havuzuna AI ile konu ekle
export async function addAITopicsToPool(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const count = Math.min(10, Math.max(1, Number(formData.get("count") || 5)));

  try {
    const topics = await generateTopicSuggestions(count);

    const created = await db.blogTopic.createMany({
      data: topics.map((title) => ({ title })),
    });

    revalidatePath("/admin/blog");

    return { success: `${created.count} yeni konu havuza eklendi.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI konu üretme hatası." };
  }
}

// Konu havuzuna manuel konu ekle
export async function addManualTopicToPool(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  await db.blogTopic.create({ data: { title } });

  revalidatePath("/admin/blog");
}

// Konu havuzundan konu sil
export async function deleteTopicFromPool(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  if (!id) return;

  await db.blogTopic.delete({ where: { id } });
  revalidatePath("/admin/blog");
}

// Manuel belirli bir yazıyı tüm dillere çevir
export async function triggerBlogTranslation(postId: string) {
  const session = await auth();
  ensureAdmin(session);

  try {
    const result = await translateSinglePost(postId);
    revalidatePath("/admin/blog");
    return result;
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Çeviri hatası.",
      details: [],
    };
  }
}

// Tek bir dil için yeniden çeviri tetikle (hata düzeltme)
export async function retranslateLanguage(postId: string, lang: string) {
  const session = await auth();
  ensureAdmin(session);

  // langStatus[lang] = pending yap ki bir sonraki cron alsın
  const post = await db.blogPost.findUnique({
    where: { id: postId },
    select: { langStatus: true },
  });
  if (!post) return { success: false, message: "Yazı bulunamadı." };

  const langStatus: BlogLangStatus = (post.langStatus as BlogLangStatus | null) ?? {};
  langStatus[lang] = "pending";

  await db.blogPost.update({
    where: { id: postId },
    data: { langStatus: langStatus as never },
  });

  revalidatePath("/admin/blog");
  return { success: true, message: `${lang} çevirisi kuyruğa alındı.` };
}

// Tüm dilleri sıfırla (pending yap)
export async function resetBlogTranslations(postId: string) {
  const session = await auth();
  ensureAdmin(session);

  const resetStatus: BlogLangStatus = Object.fromEntries(
    BLOG_TRANSLATE_LANGS.map((l) => [l, "pending"]),
  );
  const emptyTranslations: BlogTranslations = {};

  await db.blogPost.update({
    where: { id: postId },
    data: {
      langStatus: resetStatus as never,
      translations: emptyTranslations as never,
    },
  });

  revalidatePath("/admin/blog");
  return { success: true, message: "Tüm çeviriler sıfırlandı ve kuyruğa alındı." };
}

// Tüm postlardaki eksik dilleri "pending" olarak kuyruğa al (bulk init)
export async function initializeAllTranslations() {
  const session = await auth();
  ensureAdmin(session);

  const allPosts = await db.blogPost.findMany({
    where: { published: true },
    select: { id: true, langStatus: true, translations: true },
  });

  const allLangs = BLOG_TRANSLATE_LANGS;
  const allPending: BlogLangStatus = Object.fromEntries(allLangs.map((l) => [l, "pending"]));
  const emptyTranslations: BlogTranslations = {};

  let initialized = 0;
  let updated = 0;

  for (const post of allPosts) {
    const existing = (post.langStatus as BlogLangStatus | null) ?? {};
    const translations = (post.translations as BlogTranslations | null) ?? {};
    const hasNoStatus = post.langStatus === null;

    // Her dili kontrol et; eksik (undefined) veya hiç başlatılmamış postları güncelle
    const missingLangs = allLangs.filter((l) => existing[l] === undefined);
    if (missingLangs.length === 0) continue;

    // Eksik dilleri "pending" yap, mevcut "done"/"error" olanları koru
    const newStatus: BlogLangStatus = { ...existing };
    for (const lang of missingLangs) {
      // Eğer zaten çevrilmişse (translations'da varsa) done yap, yoksa pending
      if (translations[lang]?.title) {
        newStatus[lang] = "done";
      } else {
        newStatus[lang] = "pending";
      }
    }

    await db.blogPost.update({
      where: { id: post.id },
      data: {
        langStatus: newStatus as never,
        translations: hasNoStatus ? (emptyTranslations as never) : undefined,
      },
    });

    if (hasNoStatus) initialized++;
    else updated++;
  }

  revalidatePath("/admin/blog");
  return {
    success: true,
    message: `${initialized} yazı sıfırdan kuyruğa alındı, ${updated} yazıda eksik diller eklendi.`,
    initialized,
    updated,
    total: allPosts.length,
  };
}

// Manuel otomatik blog post tetikle
export async function triggerAutoBlogPost() {
  const session = await auth();
  ensureAdmin(session);

  try {
    const result = await runAutoBlogPost();
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    return result;
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Otomasyon hatası." };
  }
}
