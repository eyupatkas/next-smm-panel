/**
 * Platform-specific utilities: example link placeholders.
 */

const PLATFORM_LINK_MAP: Record<string, string> = {
  "instagram":        "https://instagram.com/kullaniciadi",
  "tiktok":           "https://tiktok.com/@kullaniciadi",
  "youtube":          "https://youtube.com/c/kanaladi",
  "facebook":         "https://facebook.com/kullaniciadi",
  "twitter / x":      "https://x.com/kullaniciadi",
  "twitter":          "https://x.com/kullaniciadi",
  "twitter/x":        "https://x.com/kullaniciadi",
  "telegram":         "https://t.me/kanaladi",
  "discord":          "https://discord.gg/sunucuadi",
  "spotify":          "https://open.spotify.com/artist/...",
  "twitch":           "https://twitch.tv/kullaniciadi",
  "linkedin":         "https://linkedin.com/in/kullaniciadi",
  "kick":             "https://kick.com/kullaniciadi",
  "bluesky":          "https://bsky.app/profile/kullaniciadi.bsky.social",
  "threads":          "https://threads.net/@kullaniciadi",
  "snapchat":         "https://snapchat.com/add/kullaniciadi",
  "pinterest":        "https://pinterest.com/kullaniciadi",
  "reddit":           "https://reddit.com/r/topluluk",
  "soundcloud":       "https://soundcloud.com/kullaniciadi",
  "tumblr":           "https://kullaniciadi.tumblr.com",
  "vimeo":            "https://vimeo.com/kullaniciadi",
  "vkontakte":        "https://vk.com/kullaniciadi",
  "vk":               "https://vk.com/kullaniciadi",
  "website traffic":  "https://siteniz.com",
  "seo / backlink":   "https://siteniz.com",
  "seo":              "https://siteniz.com",
  "google":           "https://maps.google.com/.../inceleme",
  "trustpilot":       "https://trustpilot.com/review/siteniz.com",
  "wordpress":        "https://siteniz.com/makale",
  "apple music":      "https://music.apple.com/tr/artist/...",
  "audiomack":        "https://audiomack.com/kullaniciadi",
  "deezer":           "https://deezer.com/profile/...",
  "tidal":            "https://tidal.com/browse/artist/...",
  "quora":            "https://quora.com/profile/kullaniciadi",
  "medium":           "https://medium.com/@kullaniciadi",
  "github":           "https://github.com/kullaniciadi",
  "whatsapp":         "https://wa.me/905001234567",
  "rumble":           "https://rumble.com/c/kullaniciadi",
  "dailymotion":      "https://dailymotion.com/kullaniciadi",
  "coinmarketcap":    "https://coinmarketcap.com/community/profile/kullaniciadi",
  "binance":          "https://binance.com/...",
  "ok.ru":            "https://ok.ru/kullaniciadi",
  "shopee":           "https://shopee.com/kullaniciadi",
  "steam":            "https://steamcommunity.com/id/kullaniciadi",
  "kwai":             "https://kwai.com/@kullaniciadi",
  "likee":            "https://l.likee.video/p/kullaniciadi",
  "clubhouse":        "https://joinclubhouse.com/@kullaniciadi",
};

/**
 * Returns a platform-specific example URL placeholder for input fields.
 * Falls back to a generic placeholder when the platform is unknown.
 */
export function getPlatformLinkPlaceholder(platformName?: string | null): string {
  if (!platformName) return "https://instagram.com/kullaniciadi";
  const key = platformName.toLowerCase().trim();
  return PLATFORM_LINK_MAP[key] ?? `https://${key.replace(/\s+/g, "")}.com/kullaniciadi`;
}

type CustomCommentServiceSignal = {
  serviceType?: string | null;
  name?: string | null;
  categoryName?: string | null;
  parentCategoryName?: string | null;
};

function normalizeServiceText(value?: string | null) {
  return (value || "")
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u");
}

function hasAnyTerm(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

/**
 * Returns true if the service needs user-written comments.
 */
export function isCustomCommentServiceType(service?: string | CustomCommentServiceSignal | null): boolean {
  const signal = typeof service === "string" ? { serviceType: service } : service;
  if (!signal) return false;

  const searchableText = [signal.name, signal.categoryName, signal.parentCategoryName]
    .map(normalizeServiceText)
    .join(" ");

  const isPresetCommentService = hasAnyTerm(searchableText, [
    "random",
    "rastgele",
    "otomatik",
    "auto",
    "hazir",
    "emoji",
    "pozitif",
    "positive",
  ]);
  if (isPresetCommentService) return false;

  const serviceType = normalizeServiceText(signal.serviceType);
  if (serviceType.includes("custom comment") || serviceType === "comment replies") return true;

  const isCommentService = hasAnyTerm(searchableText, ["yorum", "comment"]);
  if (!isCommentService) return false;

  return hasAnyTerm(searchableText, [
    "ozel",
    "custom",
    "kendi yorum",
    "your comment",
    "user comment",
    "manual comment",
  ]);
}
