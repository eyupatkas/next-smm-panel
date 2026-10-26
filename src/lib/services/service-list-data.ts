import { db } from "@/lib/db";
import {
  idFromPublicSegment,
  publicCategorySegment,
  publicServiceSegment,
} from "@/lib/public-service-slugs";
import type { Role } from "@prisma/client";
import { getPricingMode, getUnitPriceByRole } from "@/lib/pricing";

export const PUBLIC_SERVICES_PER_PAGE = 24;

// ── Category & Service queries ───────────────────────────────────────────────

export type PublicCategory = NonNullable<
  Awaited<ReturnType<typeof findPublicCategoryBySegment>>
>;

export type PublicServiceDetail = NonNullable<
  Awaited<ReturnType<typeof findPublicServiceBySegment>>
>;

export async function findPublicCategoryBySegment(segment: string) {
  const id = idFromPublicSegment(segment);
  return db.category.findFirst({
    where: { status: true, OR: [{ slug: segment }, { id }] },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parent: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function findPublicServiceBySegment(segment: string) {
  const id = idFromPublicSegment(segment);
  return db.service.findFirst({
    where: { status: true, OR: [{ slug: segment }, { id }] },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      min: true,
      max: true,
      price: true,
      retailPrice: true,
      resellerPrice: true,
      serviceType: true,
      provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
      canRefill: true,
      canCancel: true,
      hasDripfeed: true,
      avgCompletionMinutes: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
}

export type PublicServiceCardRow = {
  id: string;
  name: string;
  slug: string | null;
  min: number;
  max: number;
  retailPrice: number | null;
  resellerPrice: number | null;
  price: number;
  serviceType: string | null;
  provider?: { retailMarkupPercent: number; resellerMarkupPercent: number } | null;
  canRefill: boolean;
  canCancel: boolean;
  hasDripfeed: boolean;
  category: {
    id: string;
    name: string;
    slug: string | null;
    parentId: string | null;
    parent: { id: string; name: string; slug: string | null } | null;
  };
};

export type SortKey = "popular" | "cheap" | "expensive" | "name";

function normalizeSearchQuery(query?: string | null) {
  const trimmed = query?.trim();
  return trimmed || null;
}

function buildServiceSearchWhere(query?: string | null) {
  const search = normalizeSearchQuery(query);
  if (!search) return {};

  return {
    OR: [
      { name: { contains: search, mode: "insensitive" as const } },
      { serviceType: { contains: search, mode: "insensitive" as const } },
      { category: { name: { contains: search, mode: "insensitive" as const } } },
      {
        category: {
          parent: { name: { contains: search, mode: "insensitive" as const } },
        },
      },
    ],
  };
}

function buildOrderBy(sort: SortKey) {
  switch (sort) {
    case "cheap":
      return [{ retailPrice: "asc" as const }, { name: "asc" as const }];
    case "expensive":
      return [{ retailPrice: "desc" as const }, { name: "asc" as const }];
    case "name":
      return [{ name: "asc" as const }];
    case "popular":
    default:
      return [
        { completedOrderCount: "desc" as const },
        { category: { sortOrder: "asc" as const } },
        { name: "asc" as const },
      ];
  }
}

export async function listPublicServicesInCategory(
  categoryId: string,
  page: number,
  perPage = PUBLIC_SERVICES_PER_PAGE,
  sort: SortKey = "popular",
  query?: string | null,
) {
  const where = {
    status: true,
    AND: [
      { OR: [{ categoryId }, { category: { parentId: categoryId } }] },
      buildServiceSearchWhere(query),
    ],
  };

  const [totalCount, rows] = await Promise.all([
    db.service.count({ where }),
    db.service.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        min: true,
        max: true,
        retailPrice: true,
        resellerPrice: true,
        price: true,
        serviceType: true,
        provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
        canRefill: true,
        canCancel: true,
        hasDripfeed: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return { totalCount, rows: rows as PublicServiceCardRow[] };
}

export async function listAllPublicServices(
  page: number,
  perPage = PUBLIC_SERVICES_PER_PAGE,
  sort: SortKey = "popular",
  query?: string | null,
) {
  const where = {
    status: true,
    ...buildServiceSearchWhere(query),
  };

  const [totalCount, rows] = await Promise.all([
    db.service.count({ where }),
    db.service.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        min: true,
        max: true,
        retailPrice: true,
        resellerPrice: true,
        price: true,
        serviceType: true,
        provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
        canRefill: true,
        canCancel: true,
        hasDripfeed: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return { totalCount, rows: rows as PublicServiceCardRow[] };
}

export async function listChildCategories(parentId: string) {
  return db.category.findMany({
    where: {
      parentId,
      status: true,
      services: { some: { status: true } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { services: { where: { status: true } } } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listRootCategories() {
  return db.category.findMany({
    where: {
      parentId: null,
      status: true,
      OR: [
        { services: { some: { status: true } } },
        {
          children: {
            some: { status: true, services: { some: { status: true } } },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      children: {
        where: { status: true, services: { some: { status: true } } },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { services: { where: { status: true } } } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 6,
      },
      _count: { select: { services: { where: { status: true } } } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listRelatedServices(
  categoryId: string,
  excludeId: string,
  limit = 4,
) {
  const rows = await db.service.findMany({
    where: { status: true, categoryId, id: { not: excludeId } },
    select: {
      id: true,
      name: true,
      slug: true,
      min: true,
      max: true,
      retailPrice: true,
      resellerPrice: true,
      price: true,
      serviceType: true,
      provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
      canRefill: true,
      canCancel: true,
      hasDripfeed: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: [{ name: "asc" }],
    take: limit,
  });
  return rows as PublicServiceCardRow[];
}

// ── Path helpers ─────────────────────────────────────────────────────────────

export function publicListBasePath(locale: string) {
  return locale === "tr" ? "/servis-listesi" : `/${locale}/servis-listesi`;
}

export function buildServiceUrl(
  basePath: string,
  service: PublicServiceCardRow,
) {
  const cat = service.category;
  const topSeg = publicCategorySegment(cat.parent ?? cat);
  const leafSeg = cat.parent ? publicCategorySegment(cat) : topSeg;
  return `${basePath}/${topSeg}/${leafSeg}/${publicServiceSegment(service)}`;
}

export function buildCategoryUrl(
  basePath: string,
  category: { id: string; name: string; slug: string | null },
) {
  return `${basePath}/${publicCategorySegment(category)}`;
}

// ── Pricing helper ──────────────────────────────────────────────────────────

export function unitPriceFor(
  role: Role | null | undefined,
  service: { price: number; retailPrice: number | null; resellerPrice: number | null },
) {
  return getUnitPriceByRole(role ?? "USER", service);
}

export function pricingModeFor(service: { min?: number | null; max?: number | null; serviceType?: string | null }) {
  return getPricingMode(service);
}
