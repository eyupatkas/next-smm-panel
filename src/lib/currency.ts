/**
 * Currency support for OptiSMM
 *
 * Base currency: TRY (all prices stored in TRY in the DB).
 * Exchange rates are fetched at runtime; these values are fallbacks.
 * Rates = 1 TRY → X foreign currency
 */

import type { Locale } from "@/i18n/routing";

export const CURRENCY_COOKIE = "NEXT_CURRENCY";
export const CURRENCY_MANUAL_COOKIE = "NEXT_CURRENCY_MANUAL";

export type CurrencyCode =
  | "TRY"
  | "USD"
  | "EUR"
  | "GBP"
  | "SAR"
  | "CNY"
  | "RUB"
  | "BRL"
  | "JPY"
  | "KRW";

export type PayTRCurrencyCode = "TRY" | "USD" | "EUR" | "GBP";

export type CurrencyRateMap = Partial<Record<CurrencyCode, number>>;

export type Currency = {
  code: CurrencyCode;     // ISO 4217
  symbol: string;
  symbolPosition: "before" | "after";
  decimalDigits: number;
  /** How many units of this currency = 1 TRY (rate relative to TRY) */
  rateFromTRY: number;
};

const currencyMeta: Record<CurrencyCode, Omit<Currency, "rateFromTRY">> = {
  TRY: { code: "TRY", symbol: "₺", symbolPosition: "before", decimalDigits: 2 },
  USD: { code: "USD", symbol: "$", symbolPosition: "before", decimalDigits: 2 },
  EUR: { code: "EUR", symbol: "€", symbolPosition: "before", decimalDigits: 2 },
  GBP: { code: "GBP", symbol: "£", symbolPosition: "before", decimalDigits: 2 },
  SAR: { code: "SAR", symbol: "ر.س", symbolPosition: "after", decimalDigits: 2 },
  CNY: { code: "CNY", symbol: "¥", symbolPosition: "before", decimalDigits: 2 },
  RUB: { code: "RUB", symbol: "₽", symbolPosition: "after", decimalDigits: 2 },
  BRL: { code: "BRL", symbol: "R$", symbolPosition: "before", decimalDigits: 2 },
  JPY: { code: "JPY", symbol: "¥", symbolPosition: "before", decimalDigits: 0 },
  KRW: { code: "KRW", symbol: "₩", symbolPosition: "before", decimalDigits: 0 },
};

export const fallbackRatesFromTRY: Record<CurrencyCode, number> = {
  TRY: 1,
  USD: 0.0222,
  EUR: 0.018926,
  GBP: 0.016388,
  SAR: 0.083255,
  CNY: 0.1521,
  RUB: 1.662836,
  BRL: 0.110574,
  JPY: 3.536435,
  KRW: 32.696257,
};

export const supportedCurrencyCodes = Object.keys(currencyMeta) as CurrencyCode[];
export const paytrCurrencyCodes: PayTRCurrencyCode[] = ["TRY", "USD", "EUR", "GBP"];

export function normalizeCurrencyCode(value: unknown): CurrencyCode | null {
  const code = String(value ?? "").trim().toUpperCase();
  return supportedCurrencyCodes.includes(code as CurrencyCode) ? (code as CurrencyCode) : null;
}

export function getCurrencyForCode(code: string, rates?: CurrencyRateMap): Currency {
  const currencyCode = normalizeCurrencyCode(code) ?? "TRY";
  return {
    ...currencyMeta[currencyCode],
    rateFromTRY: rates?.[currencyCode] ?? fallbackRatesFromTRY[currencyCode],
  };
}

export function defaultCurrencyCodeForLocale(locale: string): CurrencyCode {
  const map: Record<Locale, CurrencyCode> = {
    tr: "TRY",
    en: "USD",
    de: "EUR",
    ar: "SAR",
    zh: "CNY",
    fr: "EUR",
    es: "EUR",
    ru: "RUB",
    pt: "BRL",
    ja: "JPY",
    ko: "KRW",
    it: "EUR",
  };
  return map[locale as Locale] ?? "TRY";
}

/** Locale → Currency mapping */
export const localeCurrencyMap: Record<Locale, Currency> = {
  tr: getCurrencyForCode("TRY"),
  en: getCurrencyForCode("USD"),
  de: getCurrencyForCode("EUR"),
  ar: getCurrencyForCode("SAR"),
  zh: getCurrencyForCode("CNY"),
  fr: { ...getCurrencyForCode("EUR"), symbolPosition: "after" },
  es: { ...getCurrencyForCode("EUR"), symbolPosition: "after" },
  ru: getCurrencyForCode("RUB"),
  pt: getCurrencyForCode("BRL"),
  ja: getCurrencyForCode("JPY"),
  ko: getCurrencyForCode("KRW"),
  it: { ...getCurrencyForCode("EUR"), symbolPosition: "after" },
};

/** Convert TRY amount to target currency */
export function convertFromTRY(amountTRY: number, currency: Currency): number {
  return amountTRY * currency.rateFromTRY;
}

/**
 * Format a TRY amount for display in the given locale's currency.
 * Uses Intl.NumberFormat for proper locale-aware formatting.
 * Shows extra decimal digits for very small amounts (< 0.01).
 */
export function formatPrice(
  amountTRY: number,
  currency: Currency,
  localeCode?: string
): string {
  let converted = convertFromTRY(amountTRY, currency);
  // Float kaynağından gelen küçük artıklar (örn. -3.6e-14) "-0,0000" gibi
  // eksi-sıfır görüntüler üretmesin: gösterim anında sıfıra yuvarla.
  if (Math.abs(converted) < 0.00005) {
    converted = 0;
  }
  // Use more decimal digits for tiny amounts to avoid ₺0.00 display
  const extraDecimals = Math.abs(converted) > 0 && Math.abs(converted) < 0.01 ? 4 : currency.decimalDigits;
  const fmt = new Intl.NumberFormat(localeCode || "en", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: extraDecimals,
    maximumFractionDigits: extraDecimals,
  });
  return fmt.format(converted);
}

/**
 * Get currency for a locale.
 * Falls back to TRY if locale is not found.
 */
export function getCurrencyForLocale(locale: string, rates?: CurrencyRateMap): Currency {
  const code = defaultCurrencyCodeForLocale(locale);
  const currency = getCurrencyForCode(code, rates);
  if (["fr", "es", "it"].includes(locale) && currency.code === "EUR") {
    return { ...currency, symbolPosition: "after" };
  }
  return currency;
}

export function currencyCodeForCountry(countryCode: string | null | undefined): CurrencyCode | null {
  const country = String(countryCode ?? "").trim().toUpperCase();
  if (!country) return null;
  if (country === "TR") return "TRY";
  if (country === "US") return "USD";
  if (country === "GB" || country === "UK") return "GBP";
  if ([
    "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT",
    "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
  ].includes(country)) return "EUR";
  if (country === "SA") return "SAR";
  if (country === "CN" || country === "HK" || country === "TW") return "CNY";
  if (country === "RU") return "RUB";
  if (country === "BR") return "BRL";
  if (country === "JP") return "JPY";
  if (country === "KR") return "KRW";
  return null;
}

export function resolvePayTRCurrencyCode(code: string | null | undefined): PayTRCurrencyCode {
  const normalized = normalizeCurrencyCode(code);
  if (normalized && paytrCurrencyCodes.includes(normalized as PayTRCurrencyCode)) {
    return normalized as PayTRCurrencyCode;
  }
  return normalized === "TRY" || !normalized ? "TRY" : "USD";
}

export function toPayTRGatewayCurrency(code: PayTRCurrencyCode): "TL" | "USD" | "EUR" | "GBP" {
  return code === "TRY" ? "TL" : code;
}

/** Locale code to Intl locale code mapping */
export const localeToIntlCode: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ar: "ar-SA",
  zh: "zh-CN",
  fr: "fr-FR",
  es: "es-ES",
  ru: "ru-RU",
  pt: "pt-BR",
  ja: "ja-JP",
  ko: "ko-KR",
  it: "it-IT",
};
