"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  CURRENCY_COOKIE,
  getCurrencyForLocale,
  getCurrencyForCode,
  normalizeCurrencyCode,
  convertFromTRY,
  formatPrice,
  localeToIntlCode,
} from "@/lib/currency";
import type { Currency, CurrencyRateMap } from "@/lib/currency";

type CurrencyContextValue = {
  currency: Currency;
  /** Convert TRY amount to current currency (number) */
  convert: (amountTRY: number) => number;
  /** Format TRY amount as localized currency string */
  format: (amountTRY: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [rates, setRates] = useState<CurrencyRateMap | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (alive) setCurrencyCode(readCookie(CURRENCY_COOKIE));
    });

    fetch("/api/currency/rates", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { rates?: CurrencyRateMap } | null) => {
        if (alive && data?.rates) setRates(data.rates);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    const normalizedCode = normalizeCurrencyCode(currencyCode);
    const currency = normalizedCode
      ? getCurrencyForCode(normalizedCode, rates)
      : getCurrencyForLocale(locale, rates);
    const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
    return {
      currency,
      convert: (amountTRY) => convertFromTRY(amountTRY, currency),
      format: (amountTRY) => formatPrice(amountTRY, currency, intlLocale),
    };
  }, [currencyCode, locale, rates]);

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used inside <CurrencyProvider>");
  }
  return ctx;
}
