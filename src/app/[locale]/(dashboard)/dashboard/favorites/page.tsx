import { auth } from "@/auth";
import { FavoriteCatalogClient } from "@/components/shared/FavoriteCatalogClient";
import { db } from "@/lib/db";
import { getCurrencyForLocale, localeToIntlCode } from "@/lib/currency";
import { listFavoriteServiceIds } from "@/lib/favorites";
import { getUnitPriceByRole } from "@/lib/pricing";
import { buildServiceUrl, publicListBasePath } from "@/lib/services/service-list-data";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardFavoritesPage() {
  const session = await auth().catch(() => null);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  const locale = await getLocale();
  const favoriteIds = await listFavoriteServiceIds(
    { userId: session.user.id, guestToken: null },
    { userOnly: true },
  );
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
      unitPrice: getUnitPriceByRole(session.user.role, service),
    }));

  return (
    <FavoriteCatalogClient
      title="Favori Servislerim"
      description="En sik kullandigin servisleri panel icinde kisa yol haline getir. Fiyatlari kendi rolune gore gorur, direkt satin alma akisina gecersin."
      emptyTitle="Panel favori listeniz bos"
      emptyDescription="Public servis listesinde kalp ikonunu kullanarak favori servislerinizi biriktirebilir, sonra buradan hizlica erisebilirsiniz."
      emptyHref="/servis-listesi"
      emptyLabel="Servisleri incele"
      locale={locale}
      currency={currency}
      intlLocale={intlLocale}
      initialFavoriteIds={favoriteIds}
      services={orderedServices}
    />
  );
}