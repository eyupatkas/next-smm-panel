/**
 * Provider Service Sync
 *
 * Sağlayıcı API'lerinden güncel servis listelerini çekerek fiyat değişikliklerini
 * veritabanına yazar ve ServiceUpdate tablosuna log düşer.
 */
import { db } from "@/lib/db";
import { getMarkupSettings, getUsdToTryRate, getInrToTryRate } from "@/lib/settings";
import {
  fetchProviderServices,
  getProviderServiceDescription,
  getProviderServiceFeatures,
} from "@/lib/services/provider-service-payload";
import {
  getOrCreateAutoCategoryId,
  type CategoryCache,
} from "@/lib/services/auto-categorize";
import { applyNamePrefix } from "@/lib/services/provider-name-prefix";
import { autoTranslateMissingDatabaseContents } from "@/lib/services/auto-translate";

// ─── Sağlayıcı isimlerini servis adlarından temizle ──────────────────────────
// Sağlayıcı isimleri (ve yaygın varyasyonları) servis adlarında görünmemeli.
// Tüm markalar OptiSMM olarak sunulur.
const PROVIDER_NAME_PATTERNS = [
  /medyabayim/gi,
  /meya\s*bayim/gi,
  /meyabayim/gi,
  /turkiyeresellers/gi,
  /turkiye\s*resellers/gi,
  /bulkfollows/gi,
  /justanotherpanel/gi,
  /smm[\s-]?panel/gi,
];

function sanitizeServiceName(name: string, providerName: string): string {
  let cleaned = name;
  // Strip all known provider name patterns
  for (const pattern of PROVIDER_NAME_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  // Also strip the actual provider name dynamically
  const escapedProviderName = providerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  cleaned = cleaned.replace(new RegExp(escapedProviderName, "gi"), "");
  // Clean up leftover artifacts: leading/trailing separators, extra spaces, emojis code artifacts
  cleaned = cleaned
    .replace(/\s*[-–|]\s*$/, "")   // trailing separator
    .replace(/^\s*[-–|]\s*/, "")   // leading separator
    .replace(/\s{2,}/g, " ")       // multiple spaces
    .trim();
  return cleaned || name; // fallback to original if result is empty
}

type ServiceSyncResult = {
  providerId: string;
  providerName: string;
  scanned: number;
  updated: number;
  newServices: number;
  deactivated: number;
  errors: number;
};

async function syncSingleProvider(
  provider: { id: string; name: string; apiUrl: string; apiKey: string; baseCurrency: string; retailMarkupPercent: number; resellerMarkupPercent: number; categoryNamePrefix: string; serviceNamePrefix: string },
  _markup: { retailMarkupPercent: number; resellerMarkupPercent: number },
  usdToTryRate: number,
  inrToTryRate: number
): Promise<ServiceSyncResult> {
  // Provider'ın kendi markup oranını kullan (merkezi dinamik fiyatlandırma)
  const markup = {
    retailMarkupPercent: provider.retailMarkupPercent,
    resellerMarkupPercent: provider.resellerMarkupPercent,
  };
  const result: ServiceSyncResult = {
    providerId: provider.id,
    providerName: provider.name,
    scanned: 0,
    updated: 0,
    newServices: 0,
    deactivated: 0,
    errors: 0,
  };

  let providerServices;
  try {
    providerServices = await fetchProviderServices(provider.apiUrl, provider.apiKey);
  } catch (error) {
    console.error(`[service-sync] ${provider.name} servisleri alınamadı:`, error);
    result.errors++;
    return result;
  }

  // Fetch all existing services for this provider
  const existingServices = await db.service.findMany({
    where: { providerId: provider.id },
    select: {
      id: true,
      externalId: true,
      name: true,
      price: true,
      retailPrice: true,
      resellerPrice: true,
      status: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });

  const existingByExternalId = new Map(
    existingServices.filter((s) => s.externalId).map((s) => [s.externalId!, s])
  );

  // We'll collect all active external IDs from the provider to detect deactivated
  const activeExternalIds = new Set<string>();

  // Category cache and sort order for auto-categorization
  const categoryCache: CategoryCache = new Map<string, string>();
  const sortOrder = {
    value: (await db.category.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0,
  };

  const serviceUpdateBatch: Array<{
    serviceId?: string;
    serviceName: string;
    category?: string;
    changeType: string;
    description: string;
  }> = [];

  for (const item of providerServices) {
    const externalId = item.service != null ? String(item.service) : null;
    const rawServiceName = sanitizeServiceName((item.name || "").trim(), provider.name);
    const serviceName = applyNamePrefix(rawServiceName, provider.serviceNamePrefix);
    let currencyMultiplier = 1.0;
    if (provider.baseCurrency === "USD") {
      currencyMultiplier = usdToTryRate;
    } else if (provider.baseCurrency === "INR") {
      currencyMultiplier = inrToTryRate;
    } else if (provider.baseCurrency === "TRY") {
      currencyMultiplier = 1.0;
    } else {
      currencyMultiplier = usdToTryRate;
    }
    const baseRate = Number(item.rate) * currencyMultiplier;
    const min = Number(item.min);
    const max = Number(item.max);
    const serviceDescription = getProviderServiceDescription(item);
    const { canRefill, canCancel, hasDripfeed } = getProviderServiceFeatures(item);

    if (!externalId || !serviceName) continue;
    if (!Number.isFinite(baseRate) || baseRate <= 0) continue;
    if (!Number.isFinite(min) || !Number.isFinite(max)) continue;

    result.scanned++;
    activeExternalIds.add(externalId);

    // Yeni servis için global markup kullanılır
    const globalRetailPrice = Number(
      (baseRate * (1 + markup.retailMarkupPercent / 100)).toFixed(6)
    );
    const globalResellerPrice = Number(
      (baseRate * (1 + markup.resellerMarkupPercent / 100)).toFixed(6)
    );

    const providerCategory = (item.category || "").trim();
    const categoryId = await getOrCreateAutoCategoryId(
      db,
      categoryCache,
      sortOrder,
      serviceName,
      providerCategory,
      provider.id,
      provider.categoryNamePrefix
    );

    const existing = existingByExternalId.get(externalId);

    if (!existing) {
      // New service
      await db.service.create({
        data: {
          name: serviceName,
          description: serviceDescription,
          price: baseRate,
          retailPrice: globalRetailPrice,
          resellerPrice: globalResellerPrice,
          min,
          max,
          status: true,
          canRefill,
          canCancel,
          hasDripfeed,
          categoryId,
          providerId: provider.id,
          externalId,
          serviceType: (item.type as string) ?? "Default",
        },
      });
      result.newServices++;
      serviceUpdateBatch.push({
        serviceName,
        category: providerCategory,
        changeType: "NEW",
        description: `${provider.name} sağlayıcısından yeni servis eklendi: ${serviceName}`,
      });
    } else {
      // Existing service — check for price change
      const prevRate = existing.price;
      const priceDiff = Math.abs(baseRate - prevRate);
      const priceDiffPercent = prevRate > 0 ? (priceDiff / prevRate) * 100 : 100;
      const hasSignificantPriceChange = priceDiffPercent >= 0.5; // 0.5% eşiği

      // Mevcut markup oranlarını koru — admin manuel fiyat değiştirmişse ezilemez
      // Eğer mevcut fiyat yoksa (null), global markup'a düş
      const retailMultiplier =
        existing.retailPrice != null && prevRate > 0
          ? existing.retailPrice / prevRate
          : 1 + markup.retailMarkupPercent / 100;
      const resellerMultiplier =
        existing.resellerPrice != null && prevRate > 0
          ? existing.resellerPrice / prevRate
          : 1 + markup.resellerMarkupPercent / 100;

      const configuredRetailPrice = baseRate * (1 + markup.retailMarkupPercent / 100);
      const configuredResellerPrice = baseRate * (1 + markup.resellerMarkupPercent / 100);
      const newRetailPrice = Number(Math.max(baseRate * retailMultiplier, configuredRetailPrice).toFixed(6));
      const newResellerPrice = Number(Math.max(baseRate * resellerMultiplier, configuredResellerPrice).toFixed(6));

      const needsUpdate =
        hasSignificantPriceChange ||
        !existing.status ||
        existing.categoryId !== categoryId;

      if (needsUpdate) {
        await db.service.update({
          where: { id: existing.id },
          data: {
            name: serviceName,
            description: serviceDescription,
            price: baseRate,
            retailPrice: newRetailPrice,
            resellerPrice: newResellerPrice,
            min,
            max,
            status: true,
            canRefill,
            canCancel,
            hasDripfeed,
            categoryId,
            serviceType: (item.type as string) ?? "Default",
          },
        });
        result.updated++;

        if (hasSignificantPriceChange) {
          const direction = baseRate < prevRate ? "düştü" : "yükseldi";
          serviceUpdateBatch.push({
            serviceId: existing.id,
            serviceName,
            category: existing.category.name,
            changeType: "PRICE_CHANGE",
            description: `${serviceName} birim fiyatı ${direction}: ${prevRate.toFixed(4)} → ${baseRate.toFixed(4)} TRY/1000`,
          });
        } else if (!existing.status) {
          serviceUpdateBatch.push({
            serviceId: existing.id,
            serviceName,
            category: existing.category.name,
            changeType: "ENABLED",
            description: `${serviceName} servisi tekrar aktif edildi.`,
          });
        }
      }
    }
  }

  // Detect deactivated services (exist in DB but not in provider response)
  for (const svc of existingServices) {
    if (!svc.externalId) continue;
    if (activeExternalIds.has(svc.externalId) || !svc.status) continue;

    await db.service.update({
      where: { id: svc.id },
      data: { status: false },
    });
    result.deactivated++;
    serviceUpdateBatch.push({
      serviceId: svc.id,
      serviceName: svc.name,
      category: svc.category.name,
      changeType: "DISABLED",
      description: `${svc.name} servisi sağlayıcı tarafından kaldırıldı.`,
    });
  }

  // Batch write ServiceUpdate logs
  if (serviceUpdateBatch.length > 0) {
    await db.serviceUpdate.createMany({
      data: serviceUpdateBatch,
    });
  }

  return result;
}

export type ServiceSyncSummary = {
  ok: boolean;
  providers: ServiceSyncResult[];
  totalScanned: number;
  totalUpdated: number;
  totalNew: number;
  totalDeactivated: number;
  totalErrors: number;
  durationMs: number;
};

export async function runProviderServiceSync(): Promise<ServiceSyncSummary> {
  const start = Date.now();
  const markup = await getMarkupSettings();
  const usdToTryRate = await getUsdToTryRate();
  const inrToTryRate = await getInrToTryRate();

  const providers = await db.provider.findMany({
    where: { status: true },
    select: { id: true, name: true, apiUrl: true, apiKey: true, baseCurrency: true, retailMarkupPercent: true, resellerMarkupPercent: true, categoryNamePrefix: true, serviceNamePrefix: true },
  });

  const results: ServiceSyncResult[] = [];

  for (const provider of providers) {
    const r = await syncSingleProvider(provider, markup, usdToTryRate, inrToTryRate);
    results.push(r);
  }

  // Otomatik eksik çevirileri tamamla
  await autoTranslateMissingDatabaseContents();

  const summary: ServiceSyncSummary = {
    ok: true,
    providers: results,
    totalScanned: results.reduce((s, r) => s + r.scanned, 0),
    totalUpdated: results.reduce((s, r) => s + r.updated, 0),
    totalNew: results.reduce((s, r) => s + r.newServices, 0),
    totalDeactivated: results.reduce((s, r) => s + r.deactivated, 0),
    totalErrors: results.reduce((s, r) => s + r.errors, 0),
    durationMs: Date.now() - start,
  };

  return summary;
}
