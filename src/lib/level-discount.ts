export const LEVEL_DISCOUNT_TIERS = [
  { maxLevel: 4, discountPercent: 0 },
  { maxLevel: 9, discountPercent: 1 },
  { maxLevel: 14, discountPercent: 2 },
  { maxLevel: 19, discountPercent: 3 },
  { maxLevel: Infinity, discountPercent: 5 }
];

export function getLevelDiscountPercent(level: number): number {
  if (level <= 0) return 0;
  const tier = LEVEL_DISCOUNT_TIERS.find(t => level <= t.maxLevel);
  return tier ? tier.discountPercent : 0;
}
