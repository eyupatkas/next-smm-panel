import { AdminFavoritesClient } from "@/components/admin/AdminFavoritesClient";
import { db } from "@/lib/db";
import { getCurrencyForLocale, localeToIntlCode } from "@/lib/currency";
import { buildServiceUrl, publicListBasePath } from "@/lib/services/service-list-data";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AdminFavoritesPage() {
  const locale = await getLocale();
  const basePath = publicListBasePath(locale);
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? localeToIntlCode.tr;

  const [favorites, total, guests, members] = await Promise.all([
    db.favoriteService.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        createdAt: true,
        guestToken: true,
        serviceId: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            retailPrice: true,
            resellerPrice: true,
            min: true,
            max: true,
            serviceType: true,
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
        },
      },
    }),
    db.favoriteService.count(),
    db.favoriteService.count({ where: { userId: null, guestToken: { not: null } } }),
    db.favoriteService.count({ where: { userId: { not: null } } }),
  ]);

  const uniqueServices = new Set(favorites.map((favorite) => favorite.serviceId)).size;

  return (
    <AdminFavoritesClient
      favorites={favorites.map((favorite) => ({
        id: favorite.id,
        createdAt: favorite.createdAt.toISOString(),
        guestToken: favorite.guestToken,
        serviceId: favorite.serviceId,
        serviceName: favorite.service.name,
        serviceUrl: buildServiceUrl(basePath, favorite.service),
        platformName: favorite.service.category.parent?.name ?? favorite.service.category.name,
        categoryName: favorite.service.category.name,
        price: favorite.service.retailPrice ?? favorite.service.price,
        actorLabel: favorite.user?.email ?? favorite.user?.name ?? `Misafir:${favorite.guestToken?.slice(-6) ?? "anonim"}`,
        actorType: favorite.user ? "member" : "guest",
      }))}
      currency={currency}
      intlLocale={intlLocale}
      stats={{
        total,
        guests,
        members,
        uniqueServices,
      }}
    />
  );
}