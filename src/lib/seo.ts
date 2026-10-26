import { defaultLocale, locales, type Locale } from "@/i18n/routing";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://optismm.com";

/** BCP-47 locale → OpenGraph locale (open-graph spec) */
const OG_LOCALE_MAP: Record<string, string> = {
  tr: "tr_TR",
  en: "en_US",
  de: "de_DE",
  ar: "ar_SA",
  zh: "zh_CN",
  fr: "fr_FR",
  es: "es_ES",
  ru: "ru_RU",
  pt: "pt_BR",
  ja: "ja_JP",
  ko: "ko_KR",
  it: "it_IT",
};

export function ogLocale(locale: string): string {
  return OG_LOCALE_MAP[locale] ?? "tr_TR";
}

export function alternateOgLocales(current: string): string[] {
  return locales
    .filter((l) => l !== current)
    .map((l) => OG_LOCALE_MAP[l])
    .filter(Boolean);
}

/**
 * `as-needed` prefix kuralı: defaultLocale (tr) prefix almaz, diğerleri alır.
 * Verilen path için canonical URL üretir.
 */
export function localeUrl(locale: string, path: string = "/"): string {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) {
    return normalised === "/" ? `${SITE_URL}/` : `${SITE_URL}${normalised}`;
  }
  return normalised === "/" ? `${SITE_URL}/${locale}` : `${SITE_URL}/${locale}${normalised}`;
}

/**
 * Bir path için tüm hreflang alternatelerini üretir (x-default dahil).
 * Next.js Metadata `alternates.languages` formatında.
 */
export function hreflangAlternates(path: string = "/"): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) {
    out[l] = localeUrl(l, path);
  }
  out["x-default"] = localeUrl(defaultLocale, path);
  return out;
}

/** Canonical URL for the current locale + path */
export function canonicalUrl(locale: string, path: string = "/"): string {
  return localeUrl(locale, path);
}

export type { Locale };
export { defaultLocale, locales };
