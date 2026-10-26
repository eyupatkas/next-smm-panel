/**
 * Locale-aware helpers for fetching translated names from `translations` JSON fields.
 * Usage:  getTranslatedName(record, locale)
 *
 * translations JSON format:
 * { "en": { "name": "Instagram Followers" }, "de": { "name": "Instagram Follower" }, ... }
 */

type TranslationsJson = Record<string, { name?: string; description?: string }> | null | undefined;

/**
 * Returns the best available name for a given locale.
 * Falls back: locale → "en" → original name.
 */
export function getTranslatedName(
  original: string,
  translations: TranslationsJson,
  locale: string,
): string {
  if (!translations) return original;
  const entry = translations[locale];
  if (entry?.name) return entry.name;
  
  // Fallback to English translation if locale is not 'en'
  if (locale !== "en") {
    const enEntry = translations["en"];
    if (enEntry?.name) return enEntry.name;
  }
  return original;
}

/**
 * Returns the best available description for a given locale.
 */
export function getTranslatedDescription(
  original: string | null | undefined,
  translations: TranslationsJson,
  locale: string,
): string | null {
  if (!translations) return original ?? null;
  const entry = translations[locale];
  if (entry?.description) return entry.description;

  // Fallback to English translation if locale is not 'en'
  if (locale !== "en") {
    const enEntry = translations["en"];
    if (enEntry?.description) return enEntry.description;
  }
  return original ?? null;
}
