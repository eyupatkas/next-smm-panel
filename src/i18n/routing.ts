import { defineRouting } from "next-intl/routing";

export const locales = [
  "tr", "en", "de", "ar", "zh", "fr", "es", "ru", "pt", "ja", "ko", "it",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "tr";

export const localeNames: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  ar: "العربية",
  zh: "中文",
  fr: "Français",
  es: "Español",
  ru: "Русский",
  pt: "Português",
  ja: "日本語",
  ko: "한국어",
  it: "Italiano",
};

export const localeFlags: Record<Locale, string> = {
  tr: "🇹🇷",
  en: "🇺🇸",
  de: "🇩🇪",
  ar: "🇸🇦",
  zh: "🇨🇳",
  fr: "🇫🇷",
  es: "🇪🇸",
  ru: "🇷🇺",
  pt: "🇧🇷",
  ja: "🇯🇵",
  ko: "🇰🇷",
  it: "🇮🇹",
};

export const rtlLocales: Locale[] = ["ar"];

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
});
