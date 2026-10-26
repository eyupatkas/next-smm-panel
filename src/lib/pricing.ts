import { Role } from "@prisma/client";
import { getLevelDiscountPercent } from "./level-discount";

type ServicePriceShape = {
  price: number;
  retailPrice: number | null;
  resellerPrice: number | null;
  min?: number | null;
  max?: number | null;
  serviceType?: string | null;
  provider?: {
    retailMarkupPercent?: number | null;
    resellerMarkupPercent?: number | null;
  } | null;
};

export type PricingMode = "PER_THOUSAND" | "PER_UNIT";

function roundMoney(value: number): number {
  return Number(value.toFixed(4));
}

export function getPricingMode(service: Pick<ServicePriceShape, "min" | "max" | "serviceType">): PricingMode {
  const serviceType = String(service.serviceType ?? "").toLowerCase();

  if (serviceType.includes("package")) {
    return "PER_UNIT";
  }

  if (Number(service.min) === 1 && Number(service.max) === 1) {
    return "PER_UNIT";
  }

  return "PER_THOUSAND";
}

function getProviderMarkupPercentByRole(role: Role, service: ServicePriceShape): number | null {
  const provider = service.provider;
  const rawMarkup = role === "RESELLER"
    ? provider?.resellerMarkupPercent
    : provider?.retailMarkupPercent;

  if (rawMarkup == null || !Number.isFinite(rawMarkup) || rawMarkup < 0) {
    return null;
  }

  return rawMarkup;
}

export function getUnitPriceByRole(
  role: Role,
  service: ServicePriceShape
): number {
  const storedUnitPrice = role === "RESELLER"
    ? (service.resellerPrice != null && service.resellerPrice > 0)
      ? service.resellerPrice
      : service.price
    : (service.retailPrice != null && service.retailPrice > 0)
      ? service.retailPrice
      : service.price;

  const providerMarkup = getProviderMarkupPercentByRole(role, service);
  if (providerMarkup == null || service.price <= 0) {
    return storedUnitPrice;
  }

  const providerFloor = service.price * (1 + providerMarkup / 100);
  return Math.max(storedUnitPrice, providerFloor);
}

export function calculateCharge(
  unitPrice: number,
  quantity: number,
  pricingMode: PricingMode = "PER_THOUSAND"
): number {
  const charge = pricingMode === "PER_UNIT"
    ? unitPrice * quantity
    : (unitPrice / 1000) * quantity;

  return roundMoney(charge);
}

export function calculateProviderCost(service: ServicePriceShape, quantity: number): number {
  return calculateCharge(service.price, quantity, getPricingMode(service));
}

export function calculateSafeServiceCharge(
  role: Role,
  service: ServicePriceShape,
  quantity: number,
  userLevel?: number,
  vatRate = 20
) {
  const pricingMode = getPricingMode(service);
  const unitPrice = getUnitPriceByRole(role, service);
  const rawCharge = calculateCharge(unitPrice, quantity, pricingMode);
  const providerCost = calculateProviderCost(service, quantity);

  let charge = rawCharge;
  let appliedDiscountPercent = 0;

  if (userLevel && userLevel > 0) {
    appliedDiscountPercent = getLevelDiscountPercent(userLevel);
    if (appliedDiscountPercent > 0) {
      const discountAmount = rawCharge * (appliedDiscountPercent / 100);
      let discountedCharge = roundMoney(rawCharge - discountAmount);

      // Güvenli taban maliyet koruması: Maliyetin altına inmesini engelle
      if (discountedCharge < providerCost) {
        discountedCharge = providerCost;
      }
      charge = discountedCharge;
    }
  }

  const chargeWithVat = roundMoney(charge * (1 + Math.max(0, vatRate) / 100));

  return {
    pricingMode,
    unitPrice: roundMoney(unitPrice),
    providerCost,
    charge: chargeWithVat,
    netCharge: charge,
    vatAmount: roundMoney(chargeWithVat - charge),
    vatRate,
    isBelowProviderCost: charge + 0.0001 < providerCost,
    appliedDiscountPercent,
  };
}
