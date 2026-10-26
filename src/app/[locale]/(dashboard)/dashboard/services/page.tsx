import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ServiceListBrowser } from "@/components/dashboard/ServiceListBrowser";
import { getTranslatedName } from "@/lib/i18n-db";
import { getLocale, getTranslations } from "next-intl/server";
import { getPricingMode, getUnitPriceByRole } from "@/lib/pricing";
import { getReservedDashboardBalance } from "@/lib/services/dashboard-checkout";

export default async function ServicesPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  const role = session.user.role;
  const locale = await getLocale();
  type TJson = Record<string, { name?: string; description?: string }> | null;

  const [services, userRow, reservedBalance, providers] = await Promise.all([
    db.service.findMany({
      where: { status: true, category: { status: true } },
      select: {
        id: true,
        name: true,
        description: true,
        translations: true,
        min: true,
        max: true,
        price: true,
        retailPrice: true,
        resellerPrice: true,
        providerId: true,
        provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
        serviceType: true,
        avgCompletionMinutes: true,
        linkFormat: true,
        category: {
          select: {
            id: true,
            name: true,
            translations: true,
            parentId: true,
            parent: { select: { id: true, name: true, translations: true } },
          },
        },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { retailPrice: "asc" }],
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    }),
    getReservedDashboardBalance(db, session.user.id),
    db.provider.findMany({ where: { status: true }, select: { id: true }, orderBy: { createdAt: 'asc' } }),
  ]);

  const providerCodeMap = new Map(providers.map((p, i) => [p.id, `S${i + 1}`]));

  const serviceData = services.map((svc) => ({
    id: svc.id,
    name: getTranslatedName(svc.name, (svc as unknown as { translations: TJson }).translations, locale),
    description: svc.description,
    min: svc.min,
    max: svc.max,
    unitPrice: getUnitPriceByRole(role, svc),
    pricingMode: getPricingMode(svc),
    categoryId: svc.category.id,
    categoryName: getTranslatedName(svc.category.name, (svc.category as unknown as { translations: TJson }).translations, locale),
    parentCategoryId: svc.category.parent?.id || null,
    parentCategoryName: svc.category.parent
      ? getTranslatedName(svc.category.parent.name, (svc.category.parent as unknown as { translations: TJson }).translations, locale)
      : null,
    providerCode: svc.providerId ? (providerCodeMap.get(svc.providerId) ?? null) : null,
    avgCompletionMinutes: svc.avgCompletionMinutes ?? null,
    linkFormat: svc.linkFormat ?? "URL",
  }));

  const t = await getTranslations("servicesPage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>
      <ServiceListBrowser services={serviceData} userBalance={Math.max(Number(userRow?.balance ?? 0) - reservedBalance, 0)} />
    </div>
  );
}
