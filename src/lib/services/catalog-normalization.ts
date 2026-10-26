import type { PrismaClient } from "@prisma/client";
import {
  getOrCreateAutoCategoryId,
  type CategoryCache,
} from "./auto-categorize";

type ServiceForNormalization = {
  id: string;
  name: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    parent: { id: string; name: string } | null;
  };
};

export type CatalogNormalizationResult = {
  scanned: number;
  moved: number;
  deletedEmptyCategories: number;
  platformCount: number;
  categoryCount: number;
};

function providerCategoryText(service: ServiceForNormalization): string {
  return [service.category.parent?.name, service.category.name]
    .filter(Boolean)
    .join(" ");
}

async function deleteEmptyCategories(database: PrismaClient): Promise<number> {
  let deleted = 0;
  let changed = true;

  while (changed) {
    changed = false;
    const categories = await database.category.findMany({
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    for (const category of categories) {
      const [serviceCount, packageCount, childCount] = await Promise.all([
        database.service.count({ where: { categoryId: category.id } }),
        database.package.count({ where: { categoryId: category.id } }),
        database.category.count({ where: { parentId: category.id } }),
      ]);

      if (serviceCount > 0 || packageCount > 0 || childCount > 0) continue;

      await database.category.delete({ where: { id: category.id } });
      deleted += 1;
      changed = true;
    }
  }

  return deleted;
}

export async function normalizeServiceCatalogCategories(
  database: PrismaClient,
): Promise<CatalogNormalizationResult> {
  const services = await database.service.findMany({
    select: {
      id: true,
      name: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
          parent: { select: { id: true, name: true } },
        },
      },
    },
  });

  const sortOrder = {
    value: (await database.category.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0,
  };
  const categoryCache: CategoryCache = new Map();
  let moved = 0;

  for (const service of services) {
    const categoryId = await getOrCreateAutoCategoryId(
      database,
      categoryCache,
      sortOrder,
      service.name,
      providerCategoryText(service),
      null,
      null,
    );

    if (categoryId === service.categoryId) continue;

    await database.service.update({
      where: { id: service.id },
      data: { categoryId },
    });
    moved += 1;
  }

  const deletedEmptyCategories = await deleteEmptyCategories(database);
  const [platformCount, categoryCount] = await Promise.all([
    database.category.count({ where: { parentId: null } }),
    database.category.count({ where: { parentId: { not: null } } }),
  ]);

  return {
    scanned: services.length,
    moved,
    deletedEmptyCategories,
    platformCount,
    categoryCount,
  };
}