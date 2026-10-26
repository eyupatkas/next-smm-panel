import {
  fallbackRatesFromTRY,
  supportedCurrencyCodes,
  type CurrencyCode,
  type CurrencyRateMap,
} from "@/lib/currency";

const RATE_API_URL = "https://open.er-api.com/v6/latest/TRY";
const CACHE_MS = 6 * 60 * 60 * 1000;
type ExchangeRateMap = CurrencyRateMap & { INR?: number };

let cachedRates: { rates: ExchangeRateMap; expiresAt: number } | null = null;

function sanitizeRates(value: unknown): ExchangeRateMap | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const rawRates = source.rates;
  if (!rawRates || typeof rawRates !== "object") return null;

  const rates: ExchangeRateMap = { TRY: 1 };
  for (const code of supportedCurrencyCodes) {
    const rate = Number((rawRates as Record<string, unknown>)[code]);
    if (Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  }
  const inrRate = Number((rawRates as Record<string, unknown>).INR);
  if (Number.isFinite(inrRate) && inrRate > 0) rates.INR = inrRate;

  return rates.USD && rates.EUR && rates.GBP && rates.INR ? rates : null;
}

export async function getLiveCurrencyRates(): Promise<ExchangeRateMap> {
  const now = Date.now();
  if (cachedRates && cachedRates.expiresAt > now) return cachedRates.rates;

  try {
    const response = await fetch(RATE_API_URL, {
      next: { revalidate: 21600 },
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Exchange API returned ${response.status}`);
    const liveRates = sanitizeRates(await response.json());
    if (!liveRates) throw new Error("Exchange API returned incomplete rates");
    cachedRates = { rates: liveRates, expiresAt: now + CACHE_MS };
    return liveRates;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[currency] using fallback exchange rates", error);
    }
    return { ...fallbackRatesFromTRY, INR: 1 / 0.6 };
  }
}

export function convertTRYAmount(amountTRY: number, currencyCode: CurrencyCode, rates: CurrencyRateMap): number {
  const rate = rates[currencyCode] ?? fallbackRatesFromTRY[currencyCode];
  return amountTRY * rate;
}
