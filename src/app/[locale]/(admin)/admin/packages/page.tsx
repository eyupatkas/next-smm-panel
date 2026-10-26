import { db } from "@/lib/db";
import { AdminPackagesClient } from "@/components/admin/AdminPackagesClient";
import { getMarkupSettings } from "@/lib/settings";
import {
  analyzePackageProfitability,
  recommendPackagePricing,
  summarizePackageProfitability,
  type PackageComboItem,
} from "@/lib/services/package-profitability";

export default async function AdminPackagesPage() {
  const [categories, services, packages, markupSettings] = await Promise.all([
    db.category.findMany({
      where: {
        // Only shared categories (providerId=null) — provider-scoped are for services only
        providerId: null,
      },
      select: {
        id: true,
        name: true,
        icon: true,
        status: true,
        sortOrder: true,
        parentId: true,
        _count: { select: { children: true, packages: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.service.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        min: true,
        max: true,
        serviceType: true,
        provider: { select: { name: true } },
      },
    }),
    db.package.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        quantity: true,
        price: true,
        retailPrice: true,
        resellerPrice: true,
        showOnHomepage: true,
        status: true,
        sortOrder: true,
        categoryId: true,
        comboItems: true,
        service: { select: { id: true, name: true } },
        category: {
          select: {
            name: true,
            parent: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    }),
    getMarkupSettings(),
  ]);

  const platforms = categories
    .filter((c) => !c.parentId)
    .map((p) => ({
      ...p,
      children: categories.filter((c) => c.parentId === p.id),
    }));

  const categoryOptions = categories
    .filter((c) => c.parentId !== null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      parentName: categories.find((p) => p.id === c.parentId)?.name ?? null,
    }));

  const serviceMap = new Map(
    services.map((service) => [
      service.id,
      {
        id: service.id,
        name: service.name,
        price: service.price,
        min: service.min,
        max: service.max,
        serviceType: service.serviceType,
        providerName: service.provider?.name ?? null,
      },
    ])
  );

  const packagesWithProfitability = packages.map((pkg) => {
    const comboItems = Array.isArray(pkg.comboItems) ? (pkg.comboItems as PackageComboItem[]) : null;
    const profitability = analyzePackageProfitability({
      quantity: pkg.quantity,
      price: pkg.price,
      retailPrice: pkg.retailPrice,
      resellerPrice: pkg.resellerPrice,
      linkedServiceId: pkg.service.id,
      linkedServiceName: pkg.service.name,
      comboItems,
      serviceMap,
    });

    return {
      ...pkg,
      comboItems,
      profitability,
      suggestedPricing: recommendPackagePricing({
        profitability,
        price: pkg.price,
        retailPrice: pkg.retailPrice,
        resellerPrice: pkg.resellerPrice,
        retailMarkupPercent: markupSettings.retailMarkupPercent,
        resellerMarkupPercent: markupSettings.resellerMarkupPercent,
      }),
    };
  });

  const profitabilitySummary = summarizePackageProfitability(packagesWithProfitability);

  return (
    <AdminPackagesClient
      platforms={platforms}
      packages={packagesWithProfitability}
      categoryOptions={categoryOptions}
      profitabilitySummary={profitabilitySummary}
      markupSettings={markupSettings}
    />
  );
}
