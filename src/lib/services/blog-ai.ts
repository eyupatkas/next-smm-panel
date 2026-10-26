import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  BLOG_TRANSLATE_LANGS,
  getLangStatusSummary,
} from "@/lib/blog-constants";
import type { BlogTranslations, BlogLangStatus } from "@/lib/blog-posts";

export { BLOG_TRANSLATE_LANGS, getLangStatusSummary } from "@/lib/blog-constants";
export type { BlogLangCode } from "@/lib/blog-constants";

// ─── Dil isimleri (prompt'larda kullanılır) ──────────────────────────────────────
const LANG_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  ar: "Arabic",
  zh: "Chinese (Simplified)",
  fr: "French",
  es: "Spanish",
  ru: "Russian",
  pt: "Portuguese (Brazilian)",
  ja: "Japanese",
  ko: "Korean",
  it: "Italian",
};

// Gemini güvenlik sınırları (ücretsiz katman referansı)
// gemini-3.x-flash ailesi: tipik olarak 10-15 RPM / yüzlerce RPD
// Her cron run'da en fazla 3 çeviri → ~1 istek/20s → aylık limitin altında
const MAX_TRANSLATIONS_PER_RUN = 3;
const INTER_REQUEST_DELAY_MS = 22_000; // 22 saniye (< 15 RPM için güvenli)

// ─── Ayarlar ─────────────────────────────────────────────────────────────────

export type BlogAISettings = {
  apiKey: string;
  model: string;
  enabled: boolean;
  autoPostInterval: string; // "off" | "6h" | "12h" | "24h" | "48h" | "72h"
};

export async function getBlogAISettings(): Promise<BlogAISettings> {
  const settings = await getSettings([
    "blog_ai_api_key",
    "blog_ai_model",
    "blog_ai_enabled",
    "blog_ai_auto_post_interval",
  ]);

  return {
    apiKey: settings.blog_ai_api_key || "",
    model: settings.blog_ai_model || "gemini-3.8-flash",
    enabled: settings.blog_ai_enabled === "1",
    autoPostInterval: settings.blog_ai_auto_post_interval || "off",
  };
}

function getIntervalMs(interval: string): number {
  switch (interval) {
    case "6h":  return 6 * 3_600_000;
    case "12h": return 12 * 3_600_000;
    case "24h": return 24 * 3_600_000;
    case "48h": return 48 * 3_600_000;
    case "72h": return 72 * 3_600_000;
    default: return 0;
  }
}

export function getIntervalLabel(interval: string): string {
  switch (interval) {
    case "6h":  return "Her 6 saatte";
    case "12h": return "Her 12 saatte";
    case "24h": return "Günde 1 kez";
    case "48h": return "2 günde 1 kez";
    case "72h": return "3 günde 1 kez";
    default: return "Kapalı";
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ─── Hata tipi yardımcısı ────────────────────────────────────────────────────

function is429(message: string) {
  return (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("Too Many Requests") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

function isRetryable(message: string) {
  return (
    message.includes("503") ||
    message.includes("Service Unavailable") ||
    message.includes("overloaded") ||
    message.includes("UNAVAILABLE")
  );
}

// ─── Gemini model builder ─────────────────────────────────────────────────────

function buildModel(settings: BlogAISettings) {
  const genAI = new GoogleGenerativeAI(settings.apiKey);
  return genAI.getGenerativeModel({ model: settings.model });
}

// ─── Türkçe içerik üretici ───────────────────────────────────────────────────

export async function generateBlogContent(
  topic: string,
  aiSettings?: BlogAISettings,
): Promise<{ title: string; excerpt: string; content: string }> {
  const settings = aiSettings ?? (await getBlogAISettings());

  if (!settings.apiKey) throw new Error("Blog AI API anahtarı ayarlanmamış.");

  const model = buildModel(settings);

  const prompt = `Sen profesyonel bir SMM (Sosyal Medya Pazarlaması) ve SEO uzmanı yazarsın. Sosyal medya pazarlama paneli, organik büyüme ve dijital stratejiler hakkında derinlemesine, SEO odaklı blog yazıları yazıyorsun.

Aşağıdaki konu hakkında kapsamlı, zengin ve profesyonel bir blog yazısı yaz:
**Konu: ${topic}**

Kurallar:
- Tamamen Türkçe yaz
- SEO uyumlu, doğal akışlı, bilgilendirici ve %100 özgün olsun
- İçerik en az 1000 kelime olsun
- Zengin HTML formatında yaz (içeriği güzelleştirmek için sadece p, strong, ul, li, h2, h3, table, tr, td, th etiketlerini kullan; div, style veya script etiketleri kesinlikle kullanma)
- Konuyu alt başlıklar altında detaylandır. Başlıklar için h2 ve h3 etiketlerini kullan (## işareti kullanma)
- Okuyucuyu sıkmamak için bilgilendirici listeler (ul/li) ve kıyaslama/özet tabloları (table) serpiştir
- "OptiSMM" marka adını doğal biçimde ve kullanıcıya değer katan bağlamlarda kullan

Yanıtını SADECE şu JSON formatında ver (başka hiçbir şey ekleme):
{"title":"SEO uyumlu başlık","excerpt":"1-2 cümle özet","content":"Zengin HTML biçimli ana içerik"}`;

  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI yanıtından JSON çıkarılamadı.");

      const parsed = JSON.parse(jsonMatch[0]) as {
        title: string;
        excerpt: string;
        content: string;
      };
      if (!parsed.title || !parsed.content) throw new Error("AI yanıtında title/content eksik.");

      return parsed;
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);

      if (is429(msg)) {
        throw new Error(
          "Gemini API kota sınırına ulaşıldı. Ücretsiz planda günlük limit doldu veya dakikada çok fazla istek gönderildi.",
        );
      }

      if (isRetryable(msg) && attempt < MAX_RETRIES) {
        await delay(attempt * 15_000);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── Çeviri motoru ───────────────────────────────────────────────────────────

export async function translateBlogPost(
  post: { title: string; excerpt: string | null; content: string },
  targetLang: string,
  aiSettings: BlogAISettings,
): Promise<{ title: string; excerpt: string; content: string }> {
  if (!aiSettings.apiKey) throw new Error("Blog AI API anahtarı ayarlanmamış.");

  const langName = LANG_NAMES[targetLang] ?? targetLang;
  const model = buildModel(aiSettings);

  const prompt = `You are a professional SEO content translator. Translate the following Turkish blog post into ${langName}.

Rules:
- Translate naturally and fluently — NOT word-by-word
- Keep the same structure and ## headings
- Do NOT translate brand name "OptiSMM"
- Keep number figures and code examples unchanged
- Adapt idioms/cultural references appropriately for ${langName} audience
- Match the original tone (informative, professional)

TITLE: ${post.title}
EXCERPT: ${post.excerpt ?? ""}
CONTENT:
${post.content}

Respond ONLY with this JSON (no markdown fences, no extra text):
{"title":"translated title","excerpt":"translated excerpt","content":"translated content"}`;

  const MAX_RETRIES = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`[${targetLang}] JSON çıkarılamadı.`);

      const parsed = JSON.parse(jsonMatch[0]) as {
        title: string;
        excerpt: string;
        content: string;
      };
      if (!parsed.title || !parsed.content)
        throw new Error(`[${targetLang}] title/content eksik.`);

      return {
        title: parsed.title,
        excerpt: parsed.excerpt || post.excerpt || "",
        content: parsed.content,
      };
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (is429(msg)) throw new Error(`[${targetLang}] 429 – Kota aşıldı.`);
      if (isRetryable(msg) && attempt < MAX_RETRIES) {
        await delay(20_000);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── Konu önerileri ──────────────────────────────────────────────────────────

export async function generateTopicSuggestions(
  count: number,
  aiSettings?: BlogAISettings,
): Promise<string[]> {
  const settings = aiSettings ?? (await getBlogAISettings());
  if (!settings.apiKey) throw new Error("Blog AI API anahtarı ayarlanmamış.");

  // Hem konu havuzundaki başlıkları hem de zaten yayınlanmış blog yazısı başlıklarını çekiyoruz
  const [existingTopics, existingPosts] = await Promise.all([
    db.blogTopic.findMany({ select: { title: true } }),
    db.blogPost.findMany({ select: { title: true } })
  ]);

  const allTitles = Array.from(new Set([
    ...existingTopics.map((t) => t.title),
    ...existingPosts.map((p) => p.title)
  ]));

  // Gemini'ye son 150 konuyu benzersiz şekilde gönderiyoruz
  const existingTitlesString = allTitles.slice(-150).join("\n- ");

  const model = buildModel(settings);

  const prompt = `Sen sosyal medya pazarlama (SMM) uzmanısın. Bir SMM panel blogu için ${count} adet son derece özgün, ilgi çekici ve benzersiz Türkçe konu başlığı öner.
Konular şunlarla ilgili olabilir: Instagram/TikTok/YouTube/Twitter/X/Pinterest/Telegram büyütme, SMM panel teknik rehberleri, API entegrasyonları, influencer marketing, sosyal medya algoritmaları, içerik stratejileri, veri analitiği.

ÖNEMLİ KURALLAR:
1. Aşağıda listelenen başlıklar zaten veritabanımızda veya blogumuzda MEVCUTTUR. Önerdiğin konular bu listedekilerle KESİNLİKLE aynı veya çok benzer (farklı kelimelerle aynı anlamı taşıyan) OLMAMALIDIR:
${existingTitlesString ? `\n- ${existingTitlesString}` : "Mevcut konu yok."}

2. Kendini tekrar etme. Aynı sosyal medya platformu için hep aynı "Keşfet taktikleri" veya "Algoritma sırları" gibi konular yerine, daha spesifik, niş ve derinlemesine teknik/stratejik konular bul (Örn: "B2B Markalar LinkedIn SMM Stratejileri", "Mikro-Influencer Kampanyalarında ROI Nasıl Hesaplanır?" vb.).

Yanıtını SADECE JSON formatında ver, başka hiçbir şey ekleme:
["Konu 1","Konu 2"]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Konu listesi JSON bulunamadı.");
    const topics = JSON.parse(jsonMatch[0]) as string[];
    return topics.filter((t) => typeof t === "string" && t.trim()).slice(0, count);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (is429(msg)) throw new Error("Gemini API kota sınırına ulaşıldı.");
    throw err;
  }
}

// ─── Slug yardımcısı ─────────────────────────────────────────────────────────

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ─── Ana otomasyon fonksiyonu ─────────────────────────────────────────────────

/**
 * Sıralı çviri kuyruğu:
 * 1. Bekleyen (pending) çevirileri önce işle (max BATCH boyutuna kadar)
 * 2. Kuyruk boşsa ve interval geçtiyse yeni TR yazısı oluştur + tüm dilleri kuyruğa al
 *
 * Her çağrı MAX 3 Gemini isteği yapar → ücretsiz kota güvenli
 */
export async function runAutoBlogPost(): Promise<{
  success: boolean;
  message: string;
  details?: string[];
}> {
  const settings = await getBlogAISettings();

  if (!settings.enabled || !settings.apiKey || settings.autoPostInterval === "off") {
    return { success: false, message: "Blog AI otomasyonu devre dışı." };
  }

  const details: string[] = [];
  let apiCallsUsed = 0;

  // ── Adım 1: Bekleyen çevirileri işle ──────────────────────────────────────
  const postsWithPending = await db.blogPost.findMany({
    where: { published: true },
    select: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      langStatus: true,
      translations: true,
    },
    orderBy: { publishedAt: "asc" },
    take: 10,
  });

  for (const post of postsWithPending) {
    if (apiCallsUsed >= MAX_TRANSLATIONS_PER_RUN) break;

    const langStatus = (post.langStatus as BlogLangStatus | null) ?? {};
    // "pending" + hiç başlatılmamış (undefined = langStatus null olan eski postlar) dilleri al
    const pendingLangs = BLOG_TRANSLATE_LANGS.filter(
      (l) => langStatus[l] === "pending" || langStatus[l] === undefined,
    );

    for (const lang of pendingLangs) {
      if (apiCallsUsed >= MAX_TRANSLATIONS_PER_RUN) break;

      // 22 saniye bekleme (2. ve sonraki istek için)
      if (apiCallsUsed > 0) {
        await delay(INTER_REQUEST_DELAY_MS);
      }

      try {
        const translated = await translateBlogPost(
          { title: post.title, excerpt: post.excerpt, content: post.content },
          lang,
          settings,
        );

        const currentTranslations: BlogTranslations =
          ((post.translations as BlogTranslations | null) ?? {});
        currentTranslations[lang] = translated;
        langStatus[lang] = "done";

        await db.blogPost.update({
          where: { id: post.id },
          data: {
            translations: currentTranslations as never,
            langStatus: langStatus as never,
          },
        });

        details.push(`"${post.title.slice(0, 40)}" → ${lang} ✓`);
        apiCallsUsed++;
      } catch (err) {
        langStatus[lang] = "error";
        await db.blogPost.update({
          where: { id: post.id },
          data: { langStatus: langStatus as never },
        });
        const errMsg = err instanceof Error ? err.message : String(err);
        details.push(`"${post.title.slice(0, 40)}" → ${lang} ✗ ${errMsg.slice(0, 60)}`);
        apiCallsUsed++;
        // 429 hatası gelirse hemen dur
        if (is429(errMsg)) break;
      }
    }
  }

  if (apiCallsUsed >= MAX_TRANSLATIONS_PER_RUN) {
    return {
      success: true,
      message: `${apiCallsUsed} çeviri işlendi.`,
      details,
    };
  }

  // ── Adım 2: Yeni TR yazısı oluştur ────────────────────────────────────────
  const intervalMs = getIntervalMs(settings.autoPostInterval);
  if (intervalMs <= 0) {
    return { success: false, message: "Geçersiz interval." };
  }

  const lastPost = await db.blogPost.findFirst({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: { publishedAt: true },
  });

  if (lastPost?.publishedAt) {
    const elapsed = Date.now() - lastPost.publishedAt.getTime();
    if (elapsed < intervalMs) {
      if (details.length > 0) {
        return { success: true, message: details.join(" | "), details };
      }
      const remaining = Math.round((intervalMs - elapsed) / 60_000);
      return {
        success: false,
        message: `Henüz yayınlama zamanı gelmedi. Kalan: ~${remaining} dakika`,
      };
    }
  }

  let topic = await db.blogTopic.findFirst({
    where: { used: false },
    orderBy: { createdAt: "asc" },
  });

  if (!topic) {
    details.push("Kullanılmamış konu kalmadı. Otonom olarak yeni konu önerileri üretiliyor...");
    try {
      const newTopics = await generateTopicSuggestions(12, settings);
      if (newTopics.length > 0) {
        await db.blogTopic.createMany({
          data: newTopics.map(title => ({
            title,
            used: false
          }))
        });
        details.push(`Havuz başarıyla ${newTopics.length} adet yeni özgün konu ile güncellendi.`);
        
        // Yeniden çek
        topic = await db.blogTopic.findFirst({
          where: { used: false },
          orderBy: { createdAt: "asc" },
        });
      }
    } catch (e) {
      return {
        success: false,
        message: "Konu havuzu boştu ve yeni konular üretilirken hata oluştu: " + (e instanceof Error ? e.message : String(e)),
        details
      };
    }
  }

  if (!topic) {
    return {
      success: false,
      message: "Konu havuzunda kullanılmamış konu kalmadı ve otomatik üretim başarısız oldu.",
      details
    };
  }

  const content = await generateBlogContent(topic.title, settings);

  // Tüm hedef dilleri "pending" olarak işaretle
  const initialLangStatus: BlogLangStatus = Object.fromEntries(
    BLOG_TRANSLATE_LANGS.map((l) => [l, "pending"]),
  );

  const baseSlug = slugify(content.title);
  const existing = await db.blogPost.count({ where: { slug: { startsWith: baseSlug } } });
  const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;

  await db.blogPost.create({
    data: {
      title: content.title,
      slug,
      excerpt: content.excerpt,
      content: content.content,
      published: true,
      featured: false,
      publishedAt: new Date(),
      langStatus: initialLangStatus as never,
      translations: {},
    },
  });

  await db.blogTopic.update({
    where: { id: topic.id },
    data: { used: true, usedAt: new Date() },
  });

  // Google ve Bing'e sitemap güncellemesini pingleme (hızlı indeksleme için)
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";
    await Promise.all([
      fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(siteUrl + "/sitemap.xml")}`).catch(() => null),
      fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(siteUrl + "/sitemap.xml")}`).catch(() => null)
    ]);
    details.push("Google ve Bing sitemap pinglemesi yapıldı.");
  } catch {
    // ignore
  }

  const pendingCount = BLOG_TRANSLATE_LANGS.length;
  return {
    success: true,
    message: `"${content.title}" Türkçe yayınlandı. ${pendingCount} dil çevirisi sıraya alındı (sonraki cron çalışmalarında işlenecek).`,
    details,
  };
}

// ─── Tek yazı için manuel çeviri tetikleyici ──────────────────────────────────

export async function translateSinglePost(
  postId: string,
  langs?: string[],
): Promise<{ success: boolean; message: string; details: string[] }> {
  const settings = await getBlogAISettings();
  if (!settings.apiKey) {
    return { success: false, message: "API anahtarı yok.", details: [] };
  }

  const post = await db.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, title: true, excerpt: true, content: true, langStatus: true, translations: true },
  });
  if (!post) return { success: false, message: "Yazı bulunamadı.", details: [] };

  const langStatus: BlogLangStatus = (post.langStatus as BlogLangStatus | null) ?? {};
  const currentTranslations: BlogTranslations =
    (post.translations as BlogTranslations | null) ?? {};

  const targetLangs = (langs ?? BLOG_TRANSLATE_LANGS.slice()) as string[];
  const details: string[] = [];
  let processed = 0;

  for (const lang of targetLangs) {
    if (processed > 0) await delay(INTER_REQUEST_DELAY_MS);
    try {
      const translated = await translateBlogPost(
        { title: post.title, excerpt: post.excerpt, content: post.content },
        lang,
        settings,
      );
      currentTranslations[lang] = translated;
      langStatus[lang] = "done";
      details.push(`${lang} ✓`);
      processed++;
    } catch (err) {
      langStatus[lang] = "error";
      const msg = err instanceof Error ? err.message : String(err);
      details.push(`${lang} ✗ ${msg.slice(0, 80)}`);
      if (is429(msg)) break;
      processed++;
    }
  }

  await db.blogPost.update({
    where: { id: post.id },
    data: {
      translations: currentTranslations as never,
      langStatus: langStatus as never,
    },
  });

  return {
    success: processed > 0,
    message: `${processed} dil işlendi.`,
    details,
  };
}


