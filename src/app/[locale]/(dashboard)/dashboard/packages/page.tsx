import { db } from "@/lib/db";
import { getEffectiveSession } from "@/lib/get-effective-user";
import { PackagesBrowser } from "@/components/dashboard/PackagesBrowser";
import { getLocale } from "next-intl/server";
import { getTranslatedName, getTranslatedDescription } from "@/lib/i18n-db";

export const metadata = {
  title: "Hazır Paketler",
};

export default async function DashboardPackagesPage() {
  const { effectiveUserId } = await getEffectiveSession();
  const locale = await getLocale();

  const effectiveUser = await db.user.findUnique({
    where: { id: effectiveUserId },
    select: { role: true, balance: true },
  });
  const role = effectiveUser?.role ?? "USER";
  const balance = Number(effectiveUser?.balance ?? 0);

  // Tüm aktif paketleri platform hiyerarşisiyle çek
  const packages = await db.package.findMany({
    where: {
      status: true,
      service: { status: true },
      category: {
        status: true,
        parent: { status: true },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      quantity: true,
      price: true,
      retailPrice: true,
      resellerPrice: true,
      sortOrder: true,
      translations: true,
      category: {
        select: {
          id: true,
          name: true,
          icon: true,
          sortOrder: true,
          translations: true,
          parent: {
            select: {
              id: true,
              name: true,
              icon: true,
              sortOrder: true,
              translations: true,
            },
          },
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          min: true,
          max: true,
        },
      },
    },
    orderBy: [
      { category: { parent: { sortOrder: "asc" } } },
      { category: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { quantity: "asc" },
    ],
  });

  // Platform listesi (kategori parent'ları) → dedup
  type PlatformItem = {
    id: string;
    name: string;
    icon: string | null;
    sortOrder: number;
  };
  const platformMap = new Map<string, PlatformItem>();
  for (const pkg of packages) {
    const p = pkg.category.parent;
    if (p && !platformMap.has(p.id)) {
      platformMap.set(p.id, {
        id: p.id,
        name: getTranslatedName(p.name, p.translations as any, locale),
        icon: p.icon,
        sortOrder: p.sortOrder,
      });
    }
  }
  const platforms = Array.from(platformMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  );

  // Paketi kullanıcı rolüne göre fiyatlandır
  function displayPrice(pkg: {
    price: number;
    retailPrice: number | null;
    resellerPrice: number | null;
  }): number {
    if (role === "RESELLER") return pkg.resellerPrice ?? pkg.price;
    return pkg.retailPrice ?? pkg.price;
  }

  const packageItems = packages.map((pkg) => ({
    id: pkg.id,
    name: getTranslatedName(pkg.name, pkg.translations as any, locale),
    description: getTranslatedDescription(pkg.description, pkg.translations as any, locale),
    quantity: pkg.quantity,
    price: displayPrice(pkg),
    categoryId: pkg.category.id,
    categoryName: getTranslatedName(pkg.category.name, pkg.category.translations as any, locale),
    platformId: pkg.category.parent?.id ?? "",
    platformName: pkg.category.parent ? getTranslatedName(pkg.category.parent.name, pkg.category.parent.translations as any, locale) : "",
    platformIcon: pkg.category.parent?.icon ?? null,
    serviceId: pkg.service.id,
    serviceMin: pkg.service.min,
    serviceMax: pkg.service.max,
  }));

  return (
    <PackagesBrowser
      platforms={platforms}
      packages={packageItems}
      userBalance={balance}
    />
  );
}
