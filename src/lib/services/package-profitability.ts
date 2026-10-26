import { calculateCharge, getPricingMode } from "@/lib/pricing";

export const LOW_MARGIN_THRESHOLD = 15;

export type PackageComboItem = {
  serviceId: string;
  quantity: number;
  label?: string;
};

export type PackageCostSource = {
  id: string;
  name: string;
  price: number;
  min?: number | null;
  max?: number | null;
  serviceType?: string | null;
  providerName?: string | null;
};

export type PackageCostBreakdown = {
  serviceId: string;
  serviceName: string;
  label: string;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  providerName: string | null;
  missing: boolean;
};

export type PackagePriceAnalysis = {
  label: string;
  price: number | null;
  profit: number | null;
  margin: number | null;
  isLoss: boolean;
  isLowMargin: boolean;
};

export type PackageProfitability = {
  baseCost: number | null;
  breakdown: PackageCostBreakdown[];
  base: PackagePriceAnalysis;
  retail: PackagePriceAnalysis;
  reseller: PackagePriceAnalysis;
  primaryTier: "base" | "retail" | "reseller";
  primaryProfit: number | null;
  primaryMargin: number | null;
  isCombo: boolean;
  comboServiceCount: number;
  hasMissingCost: boolean;
  isLossMaking: boolean;
  isLowMargin: boolean;
};

export type PackageProfitabilitySummary = {
  totalCount: number;
  comboCount: number;
  lossCount: number;
  lowMarginCount: number;
  unknownCostCount: number;
  totalBaseCost: number;
  totalBaseProfit: number;
  totalRetailProfit: number;
  totalResellerProfit: number;
};

export type PackagePricingRecommendation = {
  price: number | null;
  retailPrice: number | null;
  resellerPrice: number | null;
  priceDelta: number | null;
  retailPriceDelta: number | null;
  resellerPriceDelta: number | null;
  totalLift: number;
  retailMarkupPercent: number;
  resellerMarkupPercent: number;
  needsUpdate: boolean;
};

function roundCurrency(value: number) {
  return Number(value.toFixed(4));
}

function roundPrice(value: number) {
  return Number(value.toFixed(2));
}

function createPriceAnalysis(label: string, price: number | null, cost: number | null): PackagePriceAnalysis {
  if (price == null || cost == null) {
    return {
      label,
      price,
      profit: null,
      margin: null,
      isLoss: false,
      isLowMargin: false,
    };
  }

  const profit = roundCurrency(price - cost);
  const margin = price > 0 ? Number((((price - cost) / price) * 100).toFixed(2)) : null;

  return {
    label,
    price,
    profit,
    margin,
    isLoss: profit < 0,
    isLowMargin: margin !== null && margin >= 0 && margin < LOW_MARGIN_THRESHOLD,
  };
}

export function analyzePackageProfitability(input: {
  quantity: number;
  price: number;
  retailPrice: number | null;
  resellerPrice: number | null;
  linkedServiceId: string;
  linkedServiceName: string;
  comboItems?: PackageComboItem[] | null;
  serviceMap: Map<string, PackageCostSource>;
}): PackageProfitability {
  const comboItems = Array.isArray(input.comboItems) ? input.comboItems : [];
  const isCombo = comboItems.length > 0;

  const costItems = isCombo
    ? comboItems.map((item) => ({
        serviceId: item.serviceId,
        label: item.label?.trim() || input.serviceMap.get(item.serviceId)?.name || item.serviceId,
        quantity: item.quantity,
      }))
    : [{
        serviceId: input.linkedServiceId,
        label: input.linkedServiceName,
        quantity: input.quantity,
      }];

  const breakdown = costItems.map((item) => {
      const service = input.serviceMap.get(item.serviceId);
      const pricingMode = service ? getPricingMode(service) : null;
      const unitCost = service
        ? roundCurrency(pricingMode === "PER_UNIT" ? service.price : service.price / 1000)
        : null;
      const totalCost = service ? calculateCharge(service.price, item.quantity, pricingMode ?? undefined) : null;

      return {
        serviceId: item.serviceId,
        serviceName: service?.name || item.label,
        label: item.label,
        quantity: item.quantity,
        unitCost,
        totalCost,
        providerName: service?.providerName ?? null,
        missing: !service,
      } as PackageCostBreakdown;
    });

  const hasMissingCost = breakdown.some((item) => item.missing || item.totalCost == null);
  const baseCost = hasMissingCost
    ? null
    : roundCurrency(breakdown.reduce((sum, item) => sum + (item.totalCost ?? 0), 0));

  const base = createPriceAnalysis("Baz", input.price, baseCost);
  const retail = createPriceAnalysis("Perakende", input.retailPrice, baseCost);
  const reseller = createPriceAnalysis("Bayi", input.resellerPrice, baseCost);

  const primaryTier = input.retailPrice != null ? "retail" : "base";
  const primaryAnalysis = primaryTier === "retail" ? retail : base;
  const tierAnalyses = [base, retail, reseller];

  return {
    baseCost,
    breakdown,
    base,
    retail,
    reseller,
    primaryTier,
    primaryProfit: primaryAnalysis.profit,
    primaryMargin: primaryAnalysis.margin,
    isCombo,
    comboServiceCount: breakdown.length,
    hasMissingCost,
    isLossMaking: tierAnalyses.some((item) => item.isLoss),
    isLowMargin: tierAnalyses.some((item) => item.isLowMargin),
  };
}

export function summarizePackageProfitability<T extends { profitability: PackageProfitability }>(items: T[]): PackageProfitabilitySummary {
  return items.reduce<PackageProfitabilitySummary>((summary, item) => {
    const { profitability } = item;

    summary.totalCount += 1;
    summary.comboCount += profitability.isCombo ? 1 : 0;
    summary.lossCount += profitability.isLossMaking ? 1 : 0;
    summary.lowMarginCount += profitability.isLowMargin ? 1 : 0;
    summary.unknownCostCount += profitability.hasMissingCost ? 1 : 0;
    summary.totalBaseCost += profitability.baseCost ?? 0;
    summary.totalBaseProfit += profitability.base.profit ?? 0;
    summary.totalRetailProfit += profitability.retail.profit ?? 0;
    summary.totalResellerProfit += profitability.reseller.profit ?? 0;

    return summary;
  }, {
    totalCount: 0,
    comboCount: 0,
    lossCount: 0,
    lowMarginCount: 0,
    unknownCostCount: 0,
    totalBaseCost: 0,
    totalBaseProfit: 0,
    totalRetailProfit: 0,
    totalResellerProfit: 0,
  });
}

export function recommendPackagePricing(input: {
  profitability: PackageProfitability;
  price: number;
  retailPrice: number | null;
  resellerPrice: number | null;
  retailMarkupPercent: number;
  resellerMarkupPercent: number;
  onlyIncrease?: boolean;
}): PackagePricingRecommendation | null {
  const {
    profitability,
    price,
    retailPrice,
    resellerPrice,
    retailMarkupPercent,
    resellerMarkupPercent,
    onlyIncrease = true,
  } = input;

  if (profitability.baseCost == null) {
    return null;
  }

  const retailTarget = roundPrice(
    profitability.baseCost * (1 + Math.max(retailMarkupPercent, 0) / 100)
  );
  const resellerTarget = roundPrice(
    profitability.baseCost * (1 + Math.max(resellerMarkupPercent, 0) / 100)
  );
  const baseTarget = retailTarget;

  const nextPrice = onlyIncrease ? Math.max(price, baseTarget) : baseTarget;
  const nextRetailPrice = onlyIncrease
    ? Math.max(retailPrice ?? 0, retailTarget)
    : retailTarget;
  const nextResellerPrice = onlyIncrease
    ? Math.max(resellerPrice ?? 0, resellerTarget)
    : resellerTarget;

  const priceDelta = roundPrice(nextPrice - price);
  const retailPriceDelta = roundPrice(nextRetailPrice - (retailPrice ?? 0));
  const resellerPriceDelta = roundPrice(nextResellerPrice - (resellerPrice ?? 0));
  const totalLift = roundPrice(priceDelta + retailPriceDelta + resellerPriceDelta);

  return {
    price: nextPrice,
    retailPrice: nextRetailPrice,
    resellerPrice: nextResellerPrice,
    priceDelta,
    retailPriceDelta,
    resellerPriceDelta,
    totalLift,
    retailMarkupPercent,
    resellerMarkupPercent,
    needsUpdate: priceDelta > 0 || retailPriceDelta > 0 || resellerPriceDelta > 0,
  };
}