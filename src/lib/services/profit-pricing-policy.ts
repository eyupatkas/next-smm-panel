export const PACKAGE_RETAIL_MARKUP_PERCENT = 140;
export const PACKAGE_RESELLER_MARKUP_PERCENT = 70;
export const PACKAGE_RETAIL_MINIMUM_PROFIT = 9.9;
export const PACKAGE_RESELLER_MINIMUM_PROFIT = 4.9;

export type ProviderProfitPolicy = {
  retailMarkupPercent: number;
  resellerMarkupPercent: number;
};

export function getProviderProfitPolicy(baseCurrency: string): ProviderProfitPolicy {
  if (baseCurrency.trim().toUpperCase() === "TRY") {
    return {
      retailMarkupPercent: 180,
      resellerMarkupPercent: 90,
    };
  }

  // Dövizli sağlayıcılarda kur ve fiyat yenileme aralığı için ek tampon bırakılır.
  return {
    retailMarkupPercent: 220,
    resellerMarkupPercent: 110,
  };
}

export function roundUpPsychologicalPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (value < 20) {
    const whole = Math.floor(value);
    const currentEnding = whole + 0.9;
    return Number((currentEnding + 0.000001 >= value ? currentEnding : whole + 1.9).toFixed(2));
  }

  const step = value < 100 ? 5 : 10;
  return Number((Math.ceil((value + 0.1) / step) * step - 0.1).toFixed(2));
}

export function calculatePackageSalesPrices(baseCost: number) {
  if (!Number.isFinite(baseCost) || baseCost <= 0) {
    return null;
  }

  const retailTarget = Math.max(
    baseCost * (1 + PACKAGE_RETAIL_MARKUP_PERCENT / 100),
    baseCost + PACKAGE_RETAIL_MINIMUM_PROFIT,
  );
  const resellerTarget = Math.max(
    baseCost * (1 + PACKAGE_RESELLER_MARKUP_PERCENT / 100),
    baseCost + PACKAGE_RESELLER_MINIMUM_PROFIT,
  );

  const retailPrice = roundUpPsychologicalPrice(retailTarget);
  const resellerPrice = Math.min(retailPrice, roundUpPsychologicalPrice(resellerTarget));

  return {
    retailPrice,
    resellerPrice,
    retailProfit: Number((retailPrice - baseCost).toFixed(4)),
    resellerProfit: Number((resellerPrice - baseCost).toFixed(4)),
    retailMarginPercent: Number((((retailPrice - baseCost) / retailPrice) * 100).toFixed(2)),
    resellerMarginPercent: Number((((resellerPrice - baseCost) / resellerPrice) * 100).toFixed(2)),
  };
}
