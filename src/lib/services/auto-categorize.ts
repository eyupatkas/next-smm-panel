/**
 * Auto-Categorization System
 *
 * Servis adı ve sağlayıcı kategorisi üzerinden otomatik olarak
 * PLATFORM > KATEGORİ > SERVİS hiyerarşisine yerleştirir.
 *
 * Kullanım: getOrCreateAutoCategoryId(db, serviceName, providerCategory)
 */

import type { PrismaClient } from "@prisma/client";
// ─── Platform Tanımları ───────────────────────────────────────────────────────

export type PlatformDef = {
  name: string;     // Canonical platform adı (DB'de bu kaydedilir)
  keywords: string[]; // Eşleşme için küçük harfli anahtar kelimeler
};

export const PLATFORMS: PlatformDef[] = [
  { name: "Instagram", keywords: ["instagram", "ig "] },
  { name: "TikTok",    keywords: ["tiktok", "tik tok"] },
  { name: "YouTube",   keywords: ["youtube", "yt "] },
  { name: "Facebook",  keywords: ["facebook", "fb "] },
  { name: "Twitter / X", keywords: ["twitter", " x "] },
  { name: "Telegram",  keywords: ["telegram"] },
  { name: "Discord",   keywords: ["discord"] },
  { name: "Twitch",    keywords: ["twitch"] },
  { name: "LinkedIn",  keywords: ["linkedin"] },
  { name: "Pinterest", keywords: ["pinterest"] },
  { name: "Snapchat",  keywords: ["snapchat"] },
  { name: "Reddit",    keywords: ["reddit"] },
  { name: "Spotify",   keywords: ["spotify"] },
  { name: "SoundCloud",keywords: ["soundcloud"] },
  { name: "Apple Music",keywords: ["apple music", "apple"] },
  { name: "Audiomack", keywords: ["audiomack"] },
  { name: "Deezer",    keywords: ["deezer"] },
  { name: "BoomPlay",  keywords: ["boomplay"] },
  { name: "Clubhouse", keywords: ["clubhouse"] },
  { name: "Threads",   keywords: ["threads"] },
  { name: "Tumblr",    keywords: ["tumblr"] },
  { name: "VKontakte", keywords: ["vkontakte", "vk "] },
  { name: "Coub",      keywords: ["coub"] },
  { name: "Dailymotion",keywords: ["dailymotion"] },
  { name: "Vimeo",     keywords: ["vimeo"] },
  { name: "Twitch",    keywords: ["twitch"] },
  { name: "OnlyFans",  keywords: ["onlyfans"] },
  { name: "Quora",     keywords: ["quora"] },
  { name: "Medium",    keywords: ["medium"] },
  { name: "AfreecaTV", keywords: ["afreecatv"] },
  { name: "Trovo",     keywords: ["trovo"] },
  { name: "Rumble",    keywords: ["rumble"] },
  { name: "MixCloud",  keywords: ["mixcloud"] },
  { name: "Datpiff",   keywords: ["datpiff"] },
  { name: "Dribble",   keywords: ["dribble", "dribbble"] },
  { name: "Fiverr",    keywords: ["fiverr"] },
  { name: "CoinMarketCap", keywords: ["coinmarketcap", "cmc"] },
  { name: "Binance",   keywords: ["binance"] },
  { name: "Crypto / NFT", keywords: ["crypto", "nft", "opensea", "rarible", "coingecko", "web3"] },
  { name: "Google",    keywords: ["google"] },
  { name: "Website Traffic", keywords: ["website traffic", "web traffic", "web site", "web traf"] },
  { name: "SEO / Backlink",  keywords: ["seo", "backlink"] },
];

// ─── Kategori Türü Tanımları ──────────────────────────────────────────────────

type CategoryDef = {
  name: string;       // Canonical kategori adı
  keywords: string[]; // Küçük harfli anahtar kelimeler
};

const CATEGORY_TYPES: CategoryDef[] = [
  { name: "Canlı Yayın",     keywords: ["live stream", "live view", "canlı yayın", "live video", "live"] },
  { name: "Hikaye",           keywords: ["story", "stories", "hikaye"] },
  { name: "Reel / IGTV",    keywords: ["reel", "igtv"] },
  { name: "Takipçi",         keywords: ["follower", "takipçi", "subscriber", "sub ", "members", "connections", "friends"] },
  { name: "Beğeni",          keywords: ["like", "beğeni", "reaction", "vote", "heart"] },
  { name: "İzlenme",         keywords: ["view", "izlenme", "izleme", "watch", "play", "stream", "listen"] },
  { name: "Yorum",           keywords: ["comment", "yorum", "review"] },
  { name: "Paylaşım",        keywords: ["share", "paylaşım", "retweet", "repost"] },
  { name: "Gösterim / Erişim", keywords: ["impression", "reach", "gösterim", "erişim"] },
  { name: "Kaydetme",        keywords: ["save", "kaydetme", "bookmark"] },
  { name: "Otomatik Servisler", keywords: ["auto ", "otomatik"] },
  { name: "Hedefli Servisler",  keywords: ["targeted", "hedefli", "country", "ülke"] },
  { name: "Oy / Anket",      keywords: ["poll", "vote", "oy "] },
  { name: "Mention",         keywords: ["mention"] },
  { name: "Paketler",        keywords: ["package", "bundle", "paket", "growth"] },
  { name: "Trafik",          keywords: ["traffic", "trafik", "visitor", "ziyaretçi"] },
  { name: "Üye",             keywords: ["member ", "üye", "join", "group member"] },
  { name: "Abone",           keywords: ["subscribe", "abone "] },
];

// Hiçbir eşleşme olmadığında kullanılacak fallback kategori
const FALLBACK_CATEGORY = "Genel";

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[|[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verilen metin içinden platform adını tespit eder.
 * Eşleşme bulunamazsa null döner.
 */
export function detectPlatform(text: string): string | null {
  const normalized = normalizeText(text);
  // İnstagram Threads ayrı algılanması için önce "threads" sonra "instagram"
  for (const platform of PLATFORMS) {
    for (const kw of platform.keywords) {
      if (normalized.includes(kw)) {
        return platform.name;
      }
    }
  }
  return null;
}

/**
 * Verilen metin içinden kategori türü adını tespit eder.
 * Eşleşme bulunamazsa null döner.
 */
export function detectCategoryType(text: string): string | null {
  const normalized = normalizeText(text);
  for (const cat of CATEGORY_TYPES) {
    for (const kw of cat.keywords) {
      if (normalized.includes(kw)) {
        return cat.name;
      }
    }
  }
  return null;
}

/**
 * Servis adı ve sağlayıcı kategorisinden platform + kategori türü belirler.
 * serviceName birincil kaynak, providerCategory ikincil kaynak.
 */
export function classifyService(
  serviceName: string,
  providerCategory: string
): { platformName: string; categoryName: string } {
  // Platform tespiti: önce kategori adına, sonra servis adına bak
  const platformName =
    detectPlatform(providerCategory) ||
    detectPlatform(serviceName) ||
    "Diğer";

  // Kategori türü tespiti: servis adı daha spesifiktir, önce servis adına bak
  const categoryName =
    detectCategoryType(serviceName) ||
    detectCategoryType(providerCategory) ||
    FALLBACK_CATEGORY;

  return { platformName, categoryName };
}

// ─── DB Yardımcıları ──────────────────────────────────────────────────────────

export type CategoryCache = Map<string, string>; // "shared|parentId:name" -> categoryId

/**
 * Platform > Kategori hiyerarşisini DB'de gerekirse oluşturur,
 * kategori id'sini döner.
 *
 * @param db         Prisma client
 * @param cache      In-memory cache (sync boyunca yeniden kullan)
 * @param sortOrder  Yeni kategori oluşturulduğunda kullanılacak sortOrder ref
 * @param serviceName  Servis adı (sınıflandırma için)
 * @param providerCategory  Sağlayıcının kategori adı
 * @param providerId  Geriye dönük uyumluluk için korunur; servis sahipliği Service.providerId ile ayrılır.
 *                    Kategoriler tüm sağlayıcılar için paylaşımlı tutulur.
 */
export async function getOrCreateAutoCategoryId(
  db: PrismaClient,
  cache: CategoryCache,
  sortOrder: { value: number },
  serviceName: string,
  providerCategory: string,
  providerId?: string | null,
  categoryNamePrefix?: string | null
): Promise<string> {
  void providerId;
  void categoryNamePrefix;

  const classified = classifyService(serviceName, providerCategory);
  const platformName = classified.platformName;
  const categoryName = classified.categoryName;
  const providerKey = "shared";

  // 1. Platform (root) al veya oluştur
  const platformKey = `${providerKey}|root:${platformName.toLowerCase()}`;
  let platformId = cache.get(platformKey);

  if (!platformId) {
    const existing = await db.category.findFirst({
      where: { name: platformName, parentId: null, providerId: null },
      select: { id: true },
    });

    if (existing) {
      platformId = existing.id;
    } else {
      sortOrder.value += 1;
      const created = await db.category.create({
        data: {
          name: platformName,
          status: true,
          sortOrder: sortOrder.value,
          parentId: null,
        },
        select: { id: true },
      });
      platformId = created.id;
    }
    cache.set(platformKey, platformId);
  }

  // 2. Alt kategori (type) al veya oluştur
  const subKey = `${providerKey}|${platformId}:${categoryName.toLowerCase()}`;
  let subCategoryId = cache.get(subKey);

  if (!subCategoryId) {
    const existing = await db.category.findFirst({
      where: { name: categoryName, parentId: platformId, providerId: null },
      select: { id: true },
    });

    if (existing) {
      subCategoryId = existing.id;
    } else {
      sortOrder.value += 1;
      const created = await db.category.create({
        data: {
          name: categoryName,
          status: true,
          sortOrder: sortOrder.value,
          parentId: platformId,
        },
        select: { id: true },
      });
      subCategoryId = created.id;
    }
    cache.set(subKey, subCategoryId);
  }

  return subCategoryId;
}
