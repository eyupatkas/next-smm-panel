import { db } from "@/lib/db";
import { getEffectiveSession } from "@/lib/get-effective-user";
import { getLocale } from "next-intl/server";
import { getTranslatedName } from "@/lib/i18n-db";
import { getCurrencyForLocale, formatPrice, localeToIntlCode } from "@/lib/currency";
import { getPricingMode, getUnitPriceByRole } from "@/lib/pricing";
import { ScheduledOrdersClient } from "@/components/dashboard/ScheduledOrdersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zamanlanmış Siparişler",
};

export default async function ScheduledOrdersPage() {
  const { effectiveUserId, session } = await getEffectiveSession();
  const locale = await getLocale();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  type TJson = Record<string, { name?: string; description?: string }> | null;

  const effectiveUserRow = await db.user.findUnique({
    where: { id: effectiveUserId },
    select: { balance: true, role: true },
  });
  const effectiveRole = effectiveUserRow?.role ?? session.user.role ?? "USER";

  const [scheduledOrders, services, providers] = await Promise.all([
    db.scheduledOrder.findMany({
      where: { userId: effectiveUserId },
      include: {
        service: {
          select: {
            name: true,
            translations: true,
            category: {
              select: {
                name: true,
                translations: true,
                parent: { select: { name: true, translations: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.service.findMany({
      where: { status: true, category: { status: true } },
      select: {
        id: true,
        name: true,
        translations: true,
        min: true,
        max: true,
        price: true,
        retailPrice: true,
        resellerPrice: true,
        providerId: true,
        provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
        serviceType: true,
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
    db.provider.findMany({ where: { status: true }, select: { id: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const providerCodeMap = new Map(providers.map((p, i) => [p.id, `S${i + 1}`]));

  const serviceOptions = services.map((svc) => ({
    id: svc.id,
    name: getTranslatedName(svc.name, (svc as unknown as { translations: TJson }).translations, locale),
    min: svc.min,
    max: svc.max,
    unitPrice: getUnitPriceByRole(effectiveRole, svc),
    pricingMode: getPricingMode(svc),
    categoryName: getTranslatedName(
      svc.category.name,
      (svc.category as unknown as { translations: TJson }).translations,
      locale,
    ),
    parentCategoryName: svc.category.parent
      ? getTranslatedName(
          svc.category.parent.name,
          (svc.category.parent as unknown as { translations: TJson }).translations,
          locale,
        )
      : null,
    providerCode: svc.providerId ? (providerCodeMap.get(svc.providerId) ?? null) : null,
  }));

  const orders = scheduledOrders.map((o) => ({
    id: o.id,
    link: o.link,
    quantity: o.quantity,
    charge: o.charge,
    scheduledAt: o.scheduledAt.toISOString(),
    status: o.status,
    isRecurring: o.isRecurring,
    recurrenceEveryHours: o.recurrenceEveryHours,
    recurrenceTimes: o.recurrenceTimes,
    recurrenceEndAt: o.recurrenceEndAt ? o.recurrenceEndAt.toISOString() : null,
    executedCount: o.executedCount,
    nextRunAt: o.nextRunAt ? o.nextRunAt.toISOString() : null,
    lastRunAt: o.lastRunAt ? o.lastRunAt.toISOString() : null,
    note: o.note,
    createdAt: o.createdAt.toISOString(),
    serviceName: getTranslatedName(
      o.service.name,
      (o.service as unknown as { translations: TJson }).translations,
      locale,
    ),
    chargeFormatted: fp(o.charge),
  }));

  return (
    <ScheduledOrdersClient
      scheduledOrders={orders}
      serviceOptions={serviceOptions}
      userBalance={effectiveUserRow?.balance ?? 0}
      fpLocale={{ currency, intlLocale }}
    />
  );
}
