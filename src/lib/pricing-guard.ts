import { getSettings } from "@/lib/settings";
import { calculateProviderCost } from "@/lib/pricing";

/**
 * ─── Zarar Önleyici Fiyatlandırma (Pricing Guard) ───────────────────────────
 *
 * Paket/servis satış fiyatı, sağlayıcı maliyetinin (1 + min kâr %) altına
 * düşemez. Admin ayarlardan yönetilir:
 *   - pricing_guard_enabled       ("1" / "0", varsayılan açık)
 *   - pricing_min_profit_percent  (varsayılan 100 → maliyet + %100 kâr)
 *
 * Checkout, kategori/anasayfa gösterimi ve toplu senkron bu tabanı kullanır.
 */

export const PRICING_GUARD_SETTING_KEYS = ["pricing_guard_enabled", "pricing_min_profit_percent"] as const;

export type PricingGuard = {
  enabled: boolean;
  minProfitPercent: number;
};

export const PRICING_GUARD_DEFAULTS: PricingGuard = {
  enabled: true,
  minProfitPercent: 100,
};

export async function getPricingGuard(): Promise<PricingGuard> {
  try {
    const settings = await getSettings([...PRICING_GUARD_SETTING_KEYS]);
    const enabled = settings.pricing_guard_enabled !== "0";
    const raw = Number(settings.pricing_min_profit_percent);
    const minProfitPercent = Number.isFinite(raw) && raw >= 0 ? raw : PRICING_GUARD_DEFAULTS.minProfitPercent;
    return { enabled, minProfitPercent };
  } catch {
    return PRICING_GUARD_DEFAULTS;
  }
}

/** x.xx üzerinden yukarı yuvarla — taban her zaman ilan edilenin üstünde kalır */
function ceilMoney(value: number): number {
  return Math.ceil(value * 100) / 100;
}

/**
 * İlan edilen fiyat guard tabanının altındaysa tabana çekilir.
 * Guard kapalıysa liste fiyatı aynen döner.
 */
export function applyPricingGuard(listedPrice: number, providerCost: number, guard: PricingGuard): number {
  if (!guard.enabled || !Number.isFinite(providerCost) || providerCost <= 0) return listedPrice;
  const floor = providerCost * (1 + guard.minProfitPercent / 100);
  if (listedPrice >= floor) return listedPrice;
  return ceilMoney(floor);
}

type GuardServiceShape = {
  price: number;
  serviceType?: string | null;
  min?: number | null;
  max?: number | null;
};

/** Servis maliyetinden paket taban fiyatı hesapla (adet başına / bin başına) */
export function packageCostFloor(service: GuardServiceShape, quantity: number, guard: PricingGuard): number {
  const cost = calculateProviderCost(
    { price: service.price, retailPrice: null, resellerPrice: null, serviceType: service.serviceType, min: service.min, max: service.max },
    quantity
  );
  if (!guard.enabled) return cost;
  return ceilMoney(cost * (1 + guard.minProfitPercent / 100));
}
