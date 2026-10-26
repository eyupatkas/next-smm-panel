"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { setSettings } from "@/lib/settings";
import { getPricingGuard, packageCostFloor } from "@/lib/pricing-guard";
import { calculateProviderCost } from "@/lib/pricing";
import type { Session } from "next-auth";

function ensureAdmin(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export async function savePricingSettings(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const rawPercent = Number(String(formData.get("pricing_min_profit_percent") || "").trim());

  await setSettings({
    pricing_guard_enabled: formData.get("pricing_guard_enabled") === "on" ? "1" : "0",
    pricing_min_profit_percent: String(Number.isFinite(rawPercent) && rawPercent >= 0 ? Math.round(rawPercent) : 100),
  });

  revalidatePath("/admin/settings/pricing");
  revalidatePath("/", "layout");
}

/**
 * Zarar önleyici tabanı tüm aktif paketlere uygular:
 * - Perakende (retailPrice): servis maliyetinin (1 + min kâr %) altındaysa tabana çekilir.
 * - Bayi (resellerPrice): maliyetin %10 üzerindeki tabanın altına düşemez; perakendeden
 *   pahalı olamaz (bayiye her zaman %10 indirim korunur).
 */
export async function syncPackagePricesToGuard() {
  const session = await auth();
  ensureAdmin(session);

  const guard = await getPricingGuard();
  if (!guard.enabled) {
    return { updated: 0, checked: 0, disabled: true as const };
  }

  const packages = await db.package.findMany({
    where: { status: true },
    select: {
      id: true,
      quantity: true,
      price: true,
      retailPrice: true,
      resellerPrice: true,
      service: { select: { price: true, serviceType: true, min: true, max: true } },
    },
  });

  let updated = 0;
  for (const pkg of packages) {
    if (!pkg.service) continue;
    const cost = calculateProviderCost(
      { price: pkg.service.price, retailPrice: null, resellerPrice: null, serviceType: pkg.service.serviceType, min: pkg.service.min, max: pkg.service.max },
      pkg.quantity
    );
    const retailFloor = packageCostFloor(pkg.service, pkg.quantity, guard);
    const resellerFloor = Math.ceil(cost * 1.1 * 100) / 100;
    const retail = pkg.retailPrice ?? pkg.price;
    const resellerCap = Math.ceil(retail * 0.9 * 100) / 100;

    const data: { retailPrice?: number; resellerPrice?: number } = {};
    if (retail < retailFloor) data.retailPrice = retailFloor;
    if (pkg.resellerPrice != null) {
      const next = Math.min(Math.max(pkg.resellerPrice, resellerFloor), resellerCap);
      if (next !== pkg.resellerPrice) data.resellerPrice = next;
    }

    if (Object.keys(data).length > 0) {
      await db.package.update({ where: { id: pkg.id }, data });
      updated++;
    }
  }

  revalidatePath("/", "layout");
  return { updated, checked: packages.length, disabled: false as const };
}
