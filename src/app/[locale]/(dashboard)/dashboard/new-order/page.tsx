import { db } from "@/lib/db";
import { getPricingMode, getUnitPriceByRole } from "@/lib/pricing";
import { NewOrderAdvanced } from "@/components/dashboard/NewOrderAdvanced";
import { getTranslatedName } from "@/lib/i18n-db";
import { getLocale, getTranslations } from "next-intl/server";
import { getReservedDashboardBalance } from "@/lib/services/dashboard-checkout";
import { getEffectiveSession } from "@/lib/get-effective-user";

export default async function NewOrderPage() {
  const { effectiveUserId, session } = await getEffectiveSession();

  // When impersonating, use the impersonated user's role for pricing
  const effectiveUserRow = await db.user.findUnique({
    where: { id: effectiveUserId },
    select: { balance: true, role: true, level: true },
  });
  const effectiveRole = effectiveUserRow?.role ?? session.user.role ?? "USER";

  const locale = await getLocale();
  const t = await getTranslations("newOrderForm");
  type TJson = Record<string, { name?: string; description?: string }> | null;

  const [services, reservedBalance, providers] = await Promise.all([
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
        canRefill: true,
        canCancel: true,
        hasDripfeed: true,
        serviceType: true,
        linkFormat: true,
        providerId: true,
        provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
        avgCompletionMinutes: true,
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
    getReservedDashboardBalance(db, effectiveUserId),
    db.provider.findMany({ where: { status: true }, select: { id: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  const userRow = effectiveUserRow;

  const providerCodeMap = new Map(providers.map((p, i) => [p.id, `S${i + 1}`]));

  const serviceOptions = services.map((service) => ({
    id: service.id,
    name: getTranslatedName(service.name, (service as unknown as { translations: TJson }).translations, locale),
    description: service.description,
    min: service.min,
    max: service.max,
    canRefill: service.canRefill,
    canCancel: service.canCancel,
    hasDripfeed: service.hasDripfeed,
    categoryId: service.category.id,
    categoryName: getTranslatedName(service.category.name, (service.category as unknown as { translations: TJson }).translations, locale),
    parentCategoryId: service.category.parent?.id || null,
    parentCategoryName: service.category.parent
      ? getTranslatedName(service.category.parent.name, (service.category.parent as unknown as { translations: TJson }).translations, locale)
      : null,
    unitPrice: getUnitPriceByRole(effectiveRole, service),
    pricingMode: getPricingMode(service),
    providerCode: service.providerId ? (providerCodeMap.get(service.providerId) ?? null) : null,
    avgCompletionMinutes: service.avgCompletionMinutes ?? null,
    serviceType: service.serviceType ?? "Default",
    linkFormat: service.linkFormat ?? "URL",
  }));

  const translations: Record<string, string> = {
    title: t("title"),
    subtitle: t("subtitle"),
    choosePlatform: t("choosePlatform"),
    searchServices: t("searchServices"),
    newOrder: t("newOrder"),
    link: t("targetLink"),
    quantity: t("quantity"),
    totalCost: t("totalCost"),
    submitOrder: t("submitOrder"),
    processing: t("creating"),
    serviceDetails: t("serviceDetails"),
    rate: t("rate"),
    selectPlatformHint: t("selectPlatformHint"),
    selectCategoryHint: t("selectCategoryHint"),
    showAll: t("showAll"),
    everything: t("everything"),
    // Yeni çeviriler
    requiredFields: t("requiredFields"),
    orderFailed: t("orderFailed"),
    errorRetry: t("errorRetry"),
    badgeRefill: t("badgeRefill"),
    badgeCancel: t("badgeCancel"),
    badgeDripfeed: t("badgeDripfeed"),
    availableBalance: t("availableBalance"),
    willUseBalance: t("willUseBalance"),
    paytrAmount: t("paytrAmount"),
    payAndPurchase: t("payAndPurchase"),
    loadingMore: t("loadingMore"),
    noResults: t("noResults"),
    showAllPlatforms: t("showAllPlatforms"),
    showLess: t("showLess"),
    serviceCount: t("serviceCount"),
    mobileViewOrder: t("mobileViewOrder"),
    orderPayTitle: t("orderPayTitle"),
    selectServiceFirst: t("selectServiceFirst"),
    selectedService: t("selectedService"),
    minMaxHint: t("minMaxHint"),
    fillOrderDetails: t("fillOrderDetails"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>
      <NewOrderAdvanced
        services={serviceOptions}
        t={translations}
        userBalance={Math.max(Number(userRow?.balance ?? 0) - reservedBalance, 0)}
        userLevel={userRow?.level ?? 1}
      />
    </div>
  );
}
