import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@prisma/client";

import { db } from "../src/lib/db";
import {
  analyzePackageProfitability,
  type PackageComboItem,
} from "../src/lib/services/package-profitability";
import {
  calculatePackageSalesPrices,
  getProviderProfitPolicy,
  PACKAGE_RESELLER_MARKUP_PERCENT,
  PACKAGE_RETAIL_MARKUP_PERCENT,
} from "../src/lib/services/profit-pricing-policy";

const APPLY = process.argv.includes("--apply");
const BACKUP_DIRECTORY = process.env.PRICING_BACKUP_DIRECTORY || path.join(process.cwd(), "backups", "pricing");

type ServiceCostRow = {
  id: string;
  name: string;
  price: number;
  min: number;
  max: number;
  status: boolean;
  serviceType: string | null;
  providerName: string | null;
};

function isValidQuantity(service: ServiceCostRow | undefined, quantity: number) {
  return Boolean(
    service
    && service.status
    && Number.isFinite(quantity)
    && quantity >= service.min
    && quantity <= service.max,
  );
}

async function main() {
  const [providers, services, packages, settings] = await Promise.all([
    db.provider.findMany({
      select: {
        id: true,
        name: true,
        baseCurrency: true,
        retailMarkupPercent: true,
        resellerMarkupPercent: true,
      },
      orderBy: { name: "asc" },
    }),
    db.service.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        retailPrice: true,
        resellerPrice: true,
        min: true,
        max: true,
        status: true,
        serviceType: true,
        providerId: true,
        provider: { select: { name: true } },
      },
    }),
    db.package.findMany({
      select: {
        id: true,
        name: true,
        quantity: true,
        price: true,
        retailPrice: true,
        resellerPrice: true,
        status: true,
        comboItems: true,
        service: { select: { id: true, name: true } },
      },
      orderBy: { id: "asc" },
    }),
    db.setting.findMany({
      where: { key: { in: ["retail_markup_percent", "reseller_markup_percent"] } },
      select: { key: true, value: true },
      orderBy: { key: "asc" },
    }),
  ]);

  const serviceMap = new Map<string, ServiceCostRow>(
    services.map((service) => [
      service.id,
      {
        id: service.id,
        name: service.name,
        price: service.price,
        min: service.min,
        max: service.max,
        status: service.status,
        serviceType: service.serviceType,
        providerName: service.provider?.name ?? null,
      },
    ]),
  );

  const packagePlans = packages.map((pkg) => {
    const comboItems = Array.isArray(pkg.comboItems)
      ? (pkg.comboItems as PackageComboItem[])
      : [];
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
    const prices = profitability.baseCost == null
      ? null
      : calculatePackageSalesPrices(profitability.baseCost);
    const purchasable = comboItems.length > 0
      ? comboItems.every((item) => isValidQuantity(serviceMap.get(item.serviceId), item.quantity))
      : isValidQuantity(serviceMap.get(pkg.service.id), pkg.quantity);

    return {
      id: pkg.id,
      name: pkg.name,
      currentStatus: pkg.status,
      nextStatus: pkg.status && purchasable && prices !== null,
      baseCost: profitability.baseCost,
      currentRetailPrice: pkg.retailPrice ?? pkg.price,
      currentResellerPrice: pkg.resellerPrice ?? pkg.price,
      prices,
      purchasable,
    };
  });

  const priceablePlans = packagePlans.filter((plan) => plan.prices !== null);
  const activeUnpriceablePlans = packagePlans.filter(
    (plan) => plan.currentStatus && plan.prices === null,
  );
  const activeInvalidPlans = packagePlans.filter(
    (plan) => plan.currentStatus && !plan.purchasable,
  );

  const preview = {
    apply: APPLY,
    providers: providers.map((provider) => ({
      name: provider.name,
      currency: provider.baseCurrency,
      current: {
        retail: provider.retailMarkupPercent,
        reseller: provider.resellerMarkupPercent,
      },
      next: getProviderProfitPolicy(provider.baseCurrency),
    })),
    servicesRepriced: services.filter((service) => service.providerId && service.price > 0).length,
    packages: {
      total: packages.length,
      active: packages.filter((pkg) => pkg.status).length,
      priceable: priceablePlans.length,
      activeUnpriceable: activeUnpriceablePlans.length,
      activeInvalid: activeInvalidPlans.length,
      retailPriceDecreases: priceablePlans.filter(
        (plan) => plan.prices!.retailPrice < plan.currentRetailPrice,
      ).length,
      retailPriceIncreases: priceablePlans.filter(
        (plan) => plan.prices!.retailPrice > plan.currentRetailPrice,
      ).length,
      resellerPriceDecreases: priceablePlans.filter(
        (plan) => plan.prices!.resellerPrice < plan.currentResellerPrice,
      ).length,
      resellerPriceIncreases: priceablePlans.filter(
        (plan) => plan.prices!.resellerPrice > plan.currentResellerPrice,
      ).length,
    },
  };

  console.log(JSON.stringify(preview, null, 2));

  if (!APPLY) {
    console.log("Dry-run tamamlandı. Uygulamak için --apply kullanın.");
    return;
  }

  await mkdir(BACKUP_DIRECTORY, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIRECTORY, `pricing-${stamp}.json`);
  await writeFile(
    backupPath,
    JSON.stringify({
      createdAt: new Date().toISOString(),
      providers,
      services: services.map((service) => ({
        id: service.id,
        providerId: service.providerId,
        price: service.price,
        retailPrice: service.retailPrice,
        resellerPrice: service.resellerPrice,
        status: service.status,
      })),
      packages: packages.map((pkg) => ({
        id: pkg.id,
        price: pkg.price,
        retailPrice: pkg.retailPrice,
        resellerPrice: pkg.resellerPrice,
        status: pkg.status,
      })),
      settings,
    }, null, 2),
    { encoding: "utf8", mode: 0o600 },
  );

  await db.$transaction(async (tx) => {
    for (const provider of providers) {
      await tx.provider.update({
        where: { id: provider.id },
        data: getProviderProfitPolicy(provider.baseCurrency),
      });
    }

    await tx.$executeRaw`
      UPDATE "Service" AS service
      SET
        "retailPrice" = ROUND(
          (service.price * (1 + provider."retailMarkupPercent" / 100.0))::numeric,
          6
        )::double precision,
        "resellerPrice" = ROUND(
          (service.price * (1 + provider."resellerMarkupPercent" / 100.0))::numeric,
          6
        )::double precision,
        "updatedAt" = NOW()
      FROM "Provider" AS provider
      WHERE service."providerId" = provider.id
        AND service.price > 0
    `;

    await tx.setting.upsert({
      where: { key: "retail_markup_percent" },
      update: { value: String(PACKAGE_RETAIL_MARKUP_PERCENT) },
      create: { key: "retail_markup_percent", value: String(PACKAGE_RETAIL_MARKUP_PERCENT) },
    });
    await tx.setting.upsert({
      where: { key: "reseller_markup_percent" },
      update: { value: String(PACKAGE_RESELLER_MARKUP_PERCENT) },
      create: { key: "reseller_markup_percent", value: String(PACKAGE_RESELLER_MARKUP_PERCENT) },
    });

    if (priceablePlans.length > 0) {
      const values = priceablePlans.map((plan) => Prisma.sql`(
        ${plan.id},
        ${plan.prices!.retailPrice},
        ${plan.prices!.resellerPrice},
        ${plan.nextStatus}
      )`);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "Package" AS package
        SET
          price = updates.retail_price::double precision,
          "retailPrice" = updates.retail_price::double precision,
          "resellerPrice" = updates.reseller_price::double precision,
          status = updates.next_status::boolean,
          "updatedAt" = NOW()
        FROM (VALUES ${Prisma.join(values)})
          AS updates(id, retail_price, reseller_price, next_status)
        WHERE package.id = updates.id::text
      `);
    }

    const unpriceableIds = packagePlans
      .filter((plan) => plan.currentStatus && plan.prices === null)
      .map((plan) => plan.id);
    if (unpriceableIds.length > 0) {
      await tx.package.updateMany({
        where: { id: { in: unpriceableIds } },
        data: { status: false },
      });
    }
  }, { maxWait: 10_000, timeout: 120_000 });

  const [providerReadback, serviceFloorViolations, activePackages] = await Promise.all([
    db.provider.findMany({
      select: {
        name: true,
        baseCurrency: true,
        retailMarkupPercent: true,
        resellerMarkupPercent: true,
      },
      orderBy: { name: "asc" },
    }),
    db.$queryRaw<Array<{ retail_violations: bigint; reseller_violations: bigint }>>`
      SELECT
        COUNT(*) FILTER (
          WHERE service.status
            AND service.price > 0
            AND service."retailPrice"
              + GREATEST(
                0.000001,
                ABS(service.price * (1 + provider."retailMarkupPercent" / 100.0)) * 0.000000000001
              )
              < service.price * (1 + provider."retailMarkupPercent" / 100.0)
        ) AS retail_violations,
        COUNT(*) FILTER (
          WHERE service.status
            AND service.price > 0
            AND service."resellerPrice"
              + GREATEST(
                0.000001,
                ABS(service.price * (1 + provider."resellerMarkupPercent" / 100.0)) * 0.000000000001
              )
              < service.price * (1 + provider."resellerMarkupPercent" / 100.0)
        ) AS reseller_violations
      FROM "Service" AS service
      JOIN "Provider" AS provider ON provider.id = service."providerId"
    `,
    db.package.findMany({
      where: { status: true },
      select: { id: true, price: true, retailPrice: true, resellerPrice: true },
    }),
  ]);

  const floorReadback = serviceFloorViolations[0];
  const invalidActivePriceCount = activePackages.filter((pkg) => (
    pkg.retailPrice == null
    || pkg.resellerPrice == null
    || pkg.retailPrice <= 0
    || pkg.resellerPrice <= 0
    || pkg.retailPrice < pkg.resellerPrice
  )).length;

  if (
    Number(floorReadback.retail_violations) !== 0
    || Number(floorReadback.reseller_violations) !== 0
    || invalidActivePriceCount > 0
  ) {
    throw new Error("Fiyat doğrulaması başarısız oldu; yedekten geri dönüş gerekli.");
  }

  console.log(JSON.stringify({
    applied: true,
    backupPath,
    providerReadback,
    serviceFloorViolations: {
      retail: Number(floorReadback.retail_violations),
      reseller: Number(floorReadback.reseller_violations),
    },
    activePackages: activePackages.length,
    invalidActivePriceCount,
    deactivatedPackages: packagePlans.filter(
      (plan) => plan.currentStatus && !plan.nextStatus,
    ).length,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
