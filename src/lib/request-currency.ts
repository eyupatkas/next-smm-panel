import { cookies, headers } from "next/headers";
import {
  CURRENCY_COOKIE,
  currencyCodeForCountry,
  defaultCurrencyCodeForLocale,
  getCurrencyForCode,
  normalizeCurrencyCode,
  resolvePayTRCurrencyCode,
  toPayTRGatewayCurrency,
  type Currency,
  type CurrencyCode,
  type CurrencyRateMap,
} from "@/lib/currency";
import { convertTRYAmount, getLiveCurrencyRates } from "@/lib/exchange-rates";
import { paytrMinorAmount } from "@/lib/paytr";

function countryFromHeaders(headerList: Headers): string | null {
  return (
    headerList.get("cf-ipcountry") ||
    headerList.get("x-vercel-ip-country") ||
    headerList.get("x-country-code") ||
    null
  );
}

function currencyCodeFromRequestHeaders(headerList: Headers, locale: string): CurrencyCode {
  const cookieHeader = headerList.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CURRENCY_COOKIE}=([^;]+)`));
  const cookieCurrency = normalizeCurrencyCode(cookieMatch ? decodeURIComponent(cookieMatch[1]) : null);
  if (cookieCurrency) return cookieCurrency;

  const countryCurrency = currencyCodeForCountry(countryFromHeaders(headerList));
  return countryCurrency ?? defaultCurrencyCodeForLocale(locale);
}

export async function getRequestCurrency(locale: string, rates?: CurrencyRateMap): Promise<Currency> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const cookieCurrency = normalizeCurrencyCode(cookieStore.get(CURRENCY_COOKIE)?.value);
  const countryCurrency = currencyCodeForCountry(countryFromHeaders(headerList));
  const code = cookieCurrency ?? countryCurrency ?? defaultCurrencyCodeForLocale(locale);
  return getCurrencyForCode(code, rates);
}

export type PayTRMoney = {
  displayCurrencyCode: CurrencyCode;
  paytrCurrencyCode: "TRY" | "USD" | "EUR" | "GBP";
  paytrCurrency: "TL" | "USD" | "EUR" | "GBP";
  amountTRY: number;
  gatewayAmount: number;
  minorAmount: number;
  lang: "tr" | "en";
};

export async function resolvePayTRMoney(request: Request, amountTRY: number, locale = "tr"): Promise<PayTRMoney> {
  const headerCurrency = currencyCodeFromRequestHeaders(request.headers, locale);
  // PayTR hesabı sadece TL desteklediği için tüm ödemeleri TL'ye çevirip başlatıyoruz.
  const paytrCurrencyCode = "TRY";
  const gatewayAmount = Number(amountTRY.toFixed(2));
  // Callback tarafı da aynı helper ile doğruladığı için yuvarlama uyumsuzluğu oluşamaz.
  const minorAmount = paytrMinorAmount(gatewayAmount);

  return {
    displayCurrencyCode: headerCurrency,
    paytrCurrencyCode,
    paytrCurrency: "TL",
    amountTRY,
    gatewayAmount,
    minorAmount,
    lang: locale === "tr" ? "tr" : "en",
  };
}