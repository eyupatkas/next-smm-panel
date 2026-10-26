// İstemci ve sunucu tarafında güvenle import edilebilir sabitler ve yardımcılar

export const BLOG_TRANSLATE_LANGS = [
  "en", "de", "ar", "zh", "fr", "es", "ru", "pt", "ja", "ko", "it",
] as const;

export type BlogLangCode = (typeof BLOG_TRANSLATE_LANGS)[number];

export type BlogLangStatus = Record<string, "done" | "pending" | "error">;

export function getLangStatusSummary(langStatus: BlogLangStatus | null): {
  done: number;
  pending: number;
  error: number;
  total: number;
} {
  if (!langStatus) return { done: 0, pending: 0, error: 0, total: BLOG_TRANSLATE_LANGS.length };
  let done = 0, pending = 0, error = 0;
  for (const lang of BLOG_TRANSLATE_LANGS) {
    const s = langStatus[lang];
    if (s === "done") done++;
    else if (s === "pending") pending++;
    else if (s === "error") error++;
  }
  return { done, pending, error, total: BLOG_TRANSLATE_LANGS.length };
}
