import { FavoriteCatalogClient } from "@/components/shared/FavoriteCatalogClient";
import { db } from "@/lib/db";
import { getCurrencyForLocale, localeToIntlCode } from "@/lib/currency";
import { getFavoriteActor, listFavoriteServiceIds } from "@/lib/favorites";
import { buildServiceUrl, publicListBasePath } from "@/lib/services/service-list-data";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const locale = await getLocale();
  const actor = await getFavoriteActor();
  const favoriteIds = await listFavoriteServiceIds(actor);
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? localeToIntlCode.tr;
  const basePath = publicListBasePath(locale);

  const services = favoriteIds.length
    ? await db.service.findMany({
        where: {
          id: { in: favoriteIds },
          status: true,
          category: { status: true },
        },
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
      })
    : [];

  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const orderedServices = favoriteIds
    .map((id) => serviceMap.get(id))
    .filter((service): service is NonNullable<typeof service> => Boolean(service))
    .map((service) => ({
      ...service,
      href: buildServiceUrl(basePath, service),
      unitPrice: service.retailPrice ?? service.price,
    }));

  return (
    <main className="min-h-screen bg-background pt-28 pb-16">
      <div className="container mx-auto px-4">
        <FavoriteCatalogClient
          title="Favori Servisler"
          description="Begendigin servisleri tek yerde tut, fiyatlarini karsilastir ve istedigin anda siparis akisini baslat. Misafir favorileri de ayni sayfada gorunur."
          emptyTitle="Henuz favori servis eklenmedi"
          emptyDescription="Servis kartlarindaki kalp ikonuna basarak favori listenizi olusturabilirsiniz."
          emptyHref="/servis-listesi"
          emptyLabel="Servis listesine git"
          locale={locale}
          currency={currency}
          intlLocale={intlLocale}
          initialFavoriteIds={favoriteIds}
          services={orderedServices}
        />
      </div>
    </main>
  );
}