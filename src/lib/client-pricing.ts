import { getLevelDiscountPercent } from "./level-discount";

export type ClientPricingMode = "PER_THOUSAND" | "PER_UNIT";

export function calculateClientCharge(
  unitPrice: number,
  quantity: number,
  pricingMode: ClientPricingMode | null | undefined,
  userLevel?: number
) {
  let activeUnitPrice = unitPrice;

  if (userLevel && userLevel > 0) {
    const discountPercent = getLevelDiscountPercent(userLevel);
    if (discountPercent > 0) {
      activeUnitPrice = unitPrice * (1 - discountPercent / 100);
    }
  }

  const charge = pricingMode === "PER_UNIT"
    ? activeUnitPrice * quantity
    : (activeUnitPrice / 1000) * quantity;

  return Number(charge.toFixed(4));
}

export function unitPriceSuffix(pricingMode: ClientPricingMode | null | undefined) {
  return pricingMode === "PER_UNIT" ? "/ adet" : "/ 1K";
}