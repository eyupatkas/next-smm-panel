import { db } from "@/lib/db";
import { AdminServicesClient } from "@/components/admin/AdminServicesClient";
import type {
  ServiceRow,
  ServiceStats,
  PlatformTab,
  ProviderOption,
  CategoryOption,
} from "@/components/admin/AdminServicesClient";

const PAGE_SIZE = 50;

function catalogKey(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SearchParams = {
  q?: string;
  platform?: string;
  category?: string;
  provider?: string;
  status?: string;
  sort?: string;
  page?: string;
};

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const platformFilter = catalogKey((sp.platform ?? "").trim());
  const categoryFilter = (sp.category ?? "").trim();
  const providerFilter = (sp.provider ?? "").trim();
  const statusFilter = (sp.status ?? "all").trim();
  const sortFilter = (sp.sort ?? "price_asc").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  // ── Base data (fetched in parallel) ─────────────────────────────────────────
  const [allCategories, providers, serviceCountsByCategory] = await Promise.all([
    db.category.findMany({
      select: { id: true, name: true, parentId: true, providerId: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.provider.findMany({
      select: { id: true, name: true, status: true, createdAt: true, retailMarkupPercent: true, resellerMarkupPercent: true },
      orderBy: { createdAt: "asc" },
    }),
    db.service.groupBy({ by: ["categoryId"], _count: { id: true } }),
  ]);

  // Provider code map: ordered by createdAt → S1, S2, ...
  const providerCodeMap = new Map<string, string>(
    providers.map((p, i) => [p.id, `S${i + 1}`]),
  );

  const providerOptions: ProviderOption[] = providers.map((p) => ({
    id: p.id,
    name: p.name,
    code: providerCodeMap.get(p.id) ?? "??",
    status: p.status,
    retailMarkupPercent: p.retailMarkupPercent,
    resellerMarkupPercent: p.resellerMarkupPercent,
  }));

  // ── Platform tabs ────────────────────────────────────────────────────────────
  const catNameById = new Map(allCategories.map((c) => [c.id, c.name]));
  const catToPlatformKey = new Map<string, string>();
  const platformMetaByCategoryId = new Map<string, { key: string; name: string }>();

  for (const c of allCategories) {
    if (c.parentId === null) {
      const key = catalogKey(c.name);
      catToPlatformKey.set(c.id, key);
      platformMetaByCategoryId.set(c.id, { key, name: c.name });
    } else {
      const parentName = catNameById.get(c.parentId);
      if (parentName) {
        const key = catalogKey(parentName);
        catToPlatformKey.set(c.id, key);
        platformMetaByCategoryId.set(c.id, { key, name: parentName });
      }
    }
  }

  const platformMap = new Map<string, { name: string; count: number }>();
  for (const c of allCategories.filter((c) => c.parentId === null)) {
    const key = catalogKey(c.name);
    if (!platformMap.has(key)) platformMap.set(key, { name: c.name, count: 0 });
  }
  for (const sc of serviceCountsByCategory) {
    const key = catToPlatformKey.get(sc.categoryId);
    if (key && platformMap.has(key)) {
      platformMap.get(key)!.count += sc._count.id;
    }
  }
  const platforms: PlatformTab[] = Array.from(platformMap.values())
    .filter((p) => p.count > 0)
    .map((p) => ({ key: catalogKey(p.name), name: p.name, count: p.count }))
    .sort((a, b) => b.count - a.count);

  const categoryCountMap = new Map(
    serviceCountsByCategory.map((row) => [row.categoryId, row._count.id]),
  );
  const categoryGroupMap = new Map<
    string,
    { id: string; name: string; platformKey: string; categoryIds: string[]; count: number }
  >();

  for (const category of allCategories.filter((item) => item.parentId !== null)) {
    const platform = platformMetaByCategoryId.get(category.id);
    if (!platform) continue;
    const key = `${platform.key}:${catalogKey(category.name)}`;
    const existing = categoryGroupMap.get(key);
    if (existing) {
      existing.categoryIds.push(category.id);
      existing.count += categoryCountMap.get(category.id) ?? 0;
    } else {
      categoryGroupMap.set(key, {
        id: key,
        name: category.name,
        platformKey: platform.key,
        categoryIds: [category.id],
        count: categoryCountMap.get(category.id) ?? 0,
      });
    }
  }

  const categories: CategoryOption[] = Array.from(categoryGroupMap.values())
    .filter((category) => category.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const categoryHealth = {
    platformCount: platforms.length,
    categoryCount: categories.length,
    duplicateCategoryGroups: categories.filter((category) => category.categoryIds.length > 1).length,
    providerScopedCategoryCount: allCategories.filter((category) => category.providerId).length,
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const [totalCount, activeCount, providerTotalStats, providerActiveStats] = await Promise.all([
    db.service.count(),
    db.service.count({ where: { status: true } }),
    db.service.groupBy({ by: ["providerId"], _count: { id: true } }),
    db.service.groupBy({ by: ["providerId"], _count: { id: true }, where: { status: true } }),
  ]);

  const providerTotalMap = new Map(
    providerTotalStats.map((r) => [r.providerId ?? "__null__", r._count.id]),
  );
  const providerActiveMap = new Map(
    providerActiveStats.map((r) => [r.providerId ?? "__null__", r._count.id]),
  );

  const stats: ServiceStats = {
    total: totalCount,
    active: activeCount,
    passive: totalCount - activeCount,
    byProvider: providers
      .filter((p) => providerTotalMap.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        code: providerCodeMap.get(p.id) ?? "??",
        activeCount: providerActiveMap.get(p.id) ?? 0,
        totalCount: providerTotalMap.get(p.id) ?? 0,
      })),
  };

  // ── Platform filter → category IDs ──────────────────────────────────────────
  let platformCategoryIds: string[] | undefined;
  if (platformFilter) {
    const matchingPlatformIds = allCategories
      .filter((c) => c.parentId === null && catalogKey(c.name) === platformFilter)
      .map((c) => c.id);
    const subCatIds = allCategories
      .filter((c) => c.parentId !== null && matchingPlatformIds.includes(c.parentId))
      .map((c) => c.id);
    platformCategoryIds = [...matchingPlatformIds, ...subCatIds];
  }

  const selectedCategoryIds = categoryFilter
    ? categories.find((category) => category.id === categoryFilter)?.categoryIds ?? [categoryFilter]
    : undefined;

  // ── Query where clause ───────────────────────────────────────────────────────
  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(selectedCategoryIds
      ? { categoryId: { in: selectedCategoryIds } }
      : platformCategoryIds
        ? { categoryId: { in: platformCategoryIds } }
        : {}),
    ...(providerFilter ? { providerId: providerFilter } : {}),
    ...(statusFilter === "active"
      ? { status: true }
      : statusFilter === "passive"
        ? { status: false }
        : {}),
  };

  const filteredTotal = await db.service.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  // ── Sort order ───────────────────────────────────────────────────────────────
  type OrderByClause =
    | { price: "asc" | "desc" }
    | { retailPrice: "asc" | "desc" }
    | { name: "asc" | "desc" }
    | { category: { sortOrder: "asc" } }
    | { category: { name: "asc" } };

  let orderBy: OrderByClause[];
  switch (sortFilter) {
    case "price_desc":
      orderBy = [{ price: "desc" }, { name: "asc" }];
      break;
    case "retail_asc":
      orderBy = [{ retailPrice: "asc" }, { price: "asc" }, { name: "asc" }];
      break;
    case "retail_desc":
      orderBy = [{ retailPrice: "desc" }, { price: "desc" }, { name: "asc" }];
      break;
    case "name_asc":
      orderBy = [{ name: "asc" }];
      break;
    case "name_desc":
      orderBy = [{ name: "desc" }];
      break;
    case "category":
      orderBy = [{ category: { sortOrder: "asc" } }, { category: { name: "asc" } }, { name: "asc" }];
      break;
    case "price_asc":
    default:
      orderBy = [{ price: "asc" }, { name: "asc" }];
      break;
  }

  const rawServices = await db.service.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      externalId: true,
      price: true,
      retailPrice: true,
      resellerPrice: true,
      min: true,
      max: true,
      status: true,
      canRefill: true,
      canCancel: true,
      hasDripfeed: true,
      avgCompletionMinutes: true,
      completedOrderCount: true,
      linkFormat: true,
      categoryId: true,
      category: {
        select: {
          name: true,
          parentId: true,
          parent: { select: { name: true } },
        },
      },
      providerId: true,
      provider: { select: { name: true } },
    },
    orderBy,
    skip,
    take: PAGE_SIZE,
  });

  const services: ServiceRow[] = rawServices.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    externalId: s.externalId,
    price: Number(s.price),
    retailPrice: s.retailPrice != null ? Number(s.retailPrice) : null,
    resellerPrice: s.resellerPrice != null ? Number(s.resellerPrice) : null,
    min: s.min,
    max: s.max,
    status: s.status,
    canRefill: s.canRefill,
    canCancel: s.canCancel,
    hasDripfeed: s.hasDripfeed,
    avgCompletionMinutes:
      s.avgCompletionMinutes != null ? Number(s.avgCompletionMinutes) : null,
    completedOrderCount: s.completedOrderCount,
    linkFormat: s.linkFormat ?? "URL",
    categoryName: s.category.name,
    parentCategoryName: s.category.parent?.name ?? null,
    providerId: s.providerId,
    providerName: s.provider?.name ?? null,
    providerCode: s.providerId ? (providerCodeMap.get(s.providerId) ?? null) : null,
  }));

  return (
    <AdminServicesClient
      services={services}
      stats={stats}
      categoryHealth={categoryHealth}
      platforms={platforms}
      providers={providerOptions}
      categories={categories}
      pagination={{ page: currentPage, totalPages, totalCount: filteredTotal }}
      filters={{ q, platform: platformFilter, category: categoryFilter, provider: providerFilter, status: statusFilter, sort: sortFilter }}
    />
  );
}
