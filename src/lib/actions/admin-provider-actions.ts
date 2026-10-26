"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { applyRounding, ensureAdmin } from "@/lib/actions/admin-action-helpers";
import {
  fetchProviderServices,
  getProviderServiceFeatures,
  getProviderServiceDescription,
  type ProviderServiceRow,
} from "@/lib/services/provider-service-payload";
import {
  getOrCreateAutoCategoryId,
  type CategoryCache,
} from "@/lib/services/auto-categorize";
import { applyNamePrefix, normalizeNamePrefix, replaceNamePrefix } from "@/lib/services/provider-name-prefix";
import { getUsdToTryRate } from "@/lib/settings";

export async function createProviderAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const name = String(formData.get("name") || "").trim();
  const apiUrl = String(formData.get("apiUrl") || "").trim();
  const apiKey = String(formData.get("apiKey") || "").trim();
  const baseCurrency = String(formData.get("baseCurrency") || "USD").trim().toUpperCase() === "TRY" ? "TRY" : "USD";
  const status = formData.get("status") === "on";
  const categoryNamePrefix = normalizeNamePrefix(formData.get("categoryNamePrefix"));
  const serviceNamePrefix = normalizeNamePrefix(formData.get("serviceNamePrefix"));

  if (!name || !apiUrl || !apiKey) return;

  await db.provider.create({
    data: {
      name,
      apiUrl,
      apiKey,
      status,
      baseCurrency,
      categoryNamePrefix,
      serviceNamePrefix,
    },
  });

  revalidatePath("/admin/providers");
  revalidatePath("/admin/settings/providers");
}

type ProviderForImport = {
  id: string;
  apiUrl: string;
  apiKey: string;
  baseCurrency: string;
  retailMarkupPercent: number;
  resellerMarkupPercent: number;
  categoryNamePrefix: string;
  serviceNamePrefix: string;
};

type ImportFilters = {
  importMode: string;
  selectedCategories: Set<string>;
  selectedServiceIds: Set<string>;
  retailRounding: string;
  resellerRounding: string;
};

function getImportFilters(formData: FormData): ImportFilters {
  const selectedCategories = String(formData.get("selectedCategories") || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const selectedServiceIds = String(formData.get("selectedServiceIds") || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    importMode: String(formData.get("importMode") || "all"),
    selectedCategories: new Set(selectedCategories),
    selectedServiceIds: new Set(selectedServiceIds),
    retailRounding: String(formData.get("retailRounding") || "NONE"),
    resellerRounding: String(formData.get("resellerRounding") || "NONE"),
  };
}

function shouldImportProviderService(item: ProviderServiceRow, filters: ImportFilters) {
  const externalId = String(item.service ?? "").trim();
  const category = String(item.category || "Genel").trim();

  if (filters.importMode === "none") return false;
  if (filters.importMode === "all") return true;
  if (filters.importMode === "categories") return filters.selectedCategories.has(category);
  if (filters.importMode === "services") return filters.selectedServiceIds.has(externalId);
  return true;
}

async function importProviderServiceRows(provider: ProviderForImport, data: ProviderServiceRow[], filters: ImportFilters) {
  const categoryCache: CategoryCache = new Map();
  const sortOrder = {
    value: (await db.category.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0,
  };

  const retailPercent = provider.retailMarkupPercent;
  const resellerPercent = provider.resellerMarkupPercent;
  const usdToTryRate = await getUsdToTryRate();
  const currencyMultiplier = (provider.baseCurrency || "USD") === "TRY" ? 1.0 : usdToTryRate;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of data) {
    if (!shouldImportProviderService(item, filters)) {
      skippedCount += 1;
      continue;
    }

    const serviceId = item.service;
    const serviceName = applyNamePrefix((item.name || "").trim(), provider.serviceNamePrefix);
    const categoryLabel = (item.category || "Genel").trim();
    const baseRate = Number(item.rate) * currencyMultiplier;
    const min = Number(item.min);
    const max = Number(item.max);
    const serviceDescription = getProviderServiceDescription(item);
    const features = getProviderServiceFeatures(item);
    const serviceType = String(item.type || "Default").trim() || "Default";

    if (!serviceId || !serviceName) continue;
    if (!Number.isFinite(baseRate) || !Number.isFinite(min) || !Number.isFinite(max)) {
      continue;
    }

    const retailPrice = applyRounding(baseRate * (1 + retailPercent / 100), filters.retailRounding);
    const resellerPrice = applyRounding(baseRate * (1 + resellerPercent / 100), filters.resellerRounding);

    const categoryId = await getOrCreateAutoCategoryId(
      db,
      categoryCache,
      sortOrder,
      serviceName,
      categoryLabel,
      provider.id,
      provider.categoryNamePrefix
    );

    const externalId = String(serviceId);
    const existing = await db.service.findFirst({
      where: {
        providerId: provider.id,
        externalId,
      },
      select: { id: true, price: true, retailPrice: true, resellerPrice: true },
    });

    if (existing) {
      const prevPrice = existing.price ?? 0;
      const existingRetailMult =
        existing.retailPrice != null && prevPrice > 0
          ? existing.retailPrice / prevPrice
          : 1 + retailPercent / 100;
      const existingResellerMult =
        existing.resellerPrice != null && prevPrice > 0
          ? existing.resellerPrice / prevPrice
          : 1 + resellerPercent / 100;

      const configuredRetailPrice = baseRate * (1 + retailPercent / 100);
      const configuredResellerPrice = baseRate * (1 + resellerPercent / 100);
      const updatedRetailPrice = applyRounding(Math.max(baseRate * existingRetailMult, configuredRetailPrice), filters.retailRounding);
      const updatedResellerPrice = applyRounding(Math.max(baseRate * existingResellerMult, configuredResellerPrice), filters.resellerRounding);

      await db.service.update({
        where: { id: existing.id },
        data: {
          name: serviceName,
          description: serviceDescription,
          price: baseRate,
          retailPrice: updatedRetailPrice,
          resellerPrice: updatedResellerPrice,
          min,
          max,
          status: true,
          categoryId,
          serviceType,
          ...features,
        },
      });
      updatedCount += 1;
    } else {
      await db.service.create({
        data: {
          name: serviceName,
          description: serviceDescription,
          price: baseRate,
          retailPrice,
          resellerPrice,
          min,
          max,
          status: true,
          categoryId,
          providerId: provider.id,
          externalId,
          serviceType,
          ...features,
        },
      });
      createdCount += 1;
    }
  }

  return { createdCount, updatedCount, skippedCount };
}

export async function createProviderWithImportAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const name = String(formData.get("name") || "").trim();
  const apiUrl = String(formData.get("apiUrl") || "").trim();
  const apiKey = String(formData.get("apiKey") || "").trim();
  const baseCurrency = String(formData.get("baseCurrency") || "USD").trim().toUpperCase() === "TRY" ? "TRY" : "USD";
  const status = formData.get("status") === "on";
  const retailMarkupPercent = Number(formData.get("retailMarkupPercent") || 200);
  const resellerMarkupPercent = Number(formData.get("resellerMarkupPercent") || 100);
  const categoryNamePrefix = normalizeNamePrefix(formData.get("categoryNamePrefix"));
  const serviceNamePrefix = normalizeNamePrefix(formData.get("serviceNamePrefix"));
  const filters = getImportFilters(formData);

  if (!name || !apiUrl || !apiKey) {
    return { error: "Saglayici adi, API URL ve API key zorunludur." };
  }

  const provider = await db.provider.create({
    data: {
      name,
      apiUrl,
      apiKey,
      status,
      baseCurrency,
      retailMarkupPercent: Number.isFinite(retailMarkupPercent) ? retailMarkupPercent : 200,
      resellerMarkupPercent: Number.isFinite(resellerMarkupPercent) ? resellerMarkupPercent : 100,
      categoryNamePrefix,
      serviceNamePrefix,
    },
    select: { id: true, apiUrl: true, apiKey: true, baseCurrency: true, retailMarkupPercent: true, resellerMarkupPercent: true, categoryNamePrefix: true, serviceNamePrefix: true },
  });

  if (filters.importMode === "none") {
    revalidatePath("/admin/providers");
    revalidatePath("/admin/settings/providers");
    return { success: `${name} saglayicisi eklendi. Servis cekimi yapilmadi.`, createdCount: 0, updatedCount: 0 };
  }

  const data = await fetchProviderServices(provider.apiUrl, provider.apiKey);
  if (!Array.isArray(data) || data.length === 0) {
    return { error: "Saglayici eklendi fakat gecerli servis verisi alinamadi." };
  }

  const result = await importProviderServiceRows(provider, data, filters);

  revalidatePath("/admin/services");
  revalidatePath("/admin/settings/providers");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/servis-listesi");

  return {
    success: `${name} eklendi. ${result.createdCount} yeni, ${result.updatedCount} guncellenen servis islendi.`,
    ...result,
  };
}

export async function updateProviderAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const apiUrl = String(formData.get("apiUrl") || "").trim();
  const apiKey = String(formData.get("apiKey") || "").trim();
  const baseCurrency = String(formData.get("baseCurrency") || "USD").trim().toUpperCase() === "TRY" ? "TRY" : "USD";
  const status = formData.get("status") === "on";
  const retailMarkupPct = Number(formData.get("retailMarkupPercent"));
  const resellerMarkupPct = Number(formData.get("resellerMarkupPercent"));
  const categoryNamePrefix = normalizeNamePrefix(formData.get("categoryNamePrefix"));
  const serviceNamePrefix = normalizeNamePrefix(formData.get("serviceNamePrefix"));

  if (!id || !name || !apiUrl) return;

  const currentProvider = await db.provider.findUnique({
    where: { id },
    select: { categoryNamePrefix: true, serviceNamePrefix: true },
  });

  await db.provider.update({
    where: { id },
    data: {
      name,
      apiUrl,
      ...(apiKey ? { apiKey } : {}),
      status,
      baseCurrency,
      categoryNamePrefix,
      serviceNamePrefix,
      ...(Number.isFinite(retailMarkupPct) && retailMarkupPct >= 0 ? { retailMarkupPercent: retailMarkupPct } : {}),
      ...(Number.isFinite(resellerMarkupPct) && resellerMarkupPct >= 0 ? { resellerMarkupPercent: resellerMarkupPct } : {}),
    },
  });

  if (currentProvider) {
    await renameProviderCatalogPrefixes(
      id,
      currentProvider.categoryNamePrefix,
      categoryNamePrefix,
      currentProvider.serviceNamePrefix,
      serviceNamePrefix,
    );
  }

  revalidatePath("/admin/providers");
  revalidatePath("/admin/settings/providers");
  revalidatePath("/admin/services");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/servis-listesi");
}

async function renameProviderCatalogPrefixes(
  providerId: string,
  oldCategoryPrefix: string,
  newCategoryPrefix: string,
  oldServicePrefix: string,
  newServicePrefix: string,
) {
  if (oldCategoryPrefix !== newCategoryPrefix) {
    const categories = await db.category.findMany({
      where: { providerId },
      select: { id: true, name: true },
    });

    for (const category of categories) {
      const nextName = replaceNamePrefix(category.name, oldCategoryPrefix, newCategoryPrefix);
      if (nextName && nextName !== category.name) {
        await db.category.update({ where: { id: category.id }, data: { name: nextName } });
      }
    }
  }

  if (oldServicePrefix !== newServicePrefix) {
    const services = await db.service.findMany({
      where: { providerId },
      select: { id: true, name: true },
    });

    for (const service of services) {
      const nextName = replaceNamePrefix(service.name, oldServicePrefix, newServicePrefix);
      if (nextName && nextName !== service.name) {
        await db.service.update({ where: { id: service.id }, data: { name: nextName } });
      }
    }
  }
}

export async function importProviderServicesAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const providerId = String(formData.get("providerId") || "");
  const filters = getImportFilters(formData);

  if (!providerId) {
    return { error: "Saglayici secilmedi." };
  }

  const provider = await db.provider.findUnique({
    where: { id: providerId },
    select: { id: true, apiUrl: true, apiKey: true, baseCurrency: true, retailMarkupPercent: true, resellerMarkupPercent: true, categoryNamePrefix: true, serviceNamePrefix: true },
  });
  if (!provider) {
    return { error: "Saglayici bulunamadi." };
  }

  const data = await fetchProviderServices(provider.apiUrl, provider.apiKey);

  if (!Array.isArray(data) || data.length === 0) {
    return { error: "Saglayicidan gecerli servis verisi alinmadi." };
  }

  const result = await importProviderServiceRows(provider, data, filters);

  revalidatePath("/admin/services");
  revalidatePath("/admin/settings/providers");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/servis-listesi");

  return {
    success: `${provider.id} saglayicisindan ${result.createdCount} yeni, ${result.updatedCount} guncellenen servis islendi.`,
    ...result,
  };
}