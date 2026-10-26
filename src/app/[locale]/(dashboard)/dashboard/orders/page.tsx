import { db } from "@/lib/db";
import { syncRecentOrdersForUser } from "@/lib/services/provider-order-sync";
import { getLocale } from "next-intl/server";
import { getEffectiveUserId } from "@/lib/get-effective-user";
import { DashboardOrdersClient } from "@/components/dashboard/DashboardOrdersClient";
import { getTranslatedName } from "@/lib/i18n-db";

export default async function OrdersPage() {
  const userId = await getEffectiveUserId();

  const locale = await getLocale();

  try {
    await syncRecentOrdersForUser(userId, { limit: 5, minRefreshMs: 12_000 });
  } catch {}

  const orders = await db.order.findMany({
    where: { userId },
    select: {
      id: true,
      quantity: true,
      charge: true,
      status: true,
      error: true,
      link: true,
      startCount: true,
      remains: true,
      cancelledAt: true,
      refundedAmount: true,
      providerStatus: true,
      lastRefillAt: true,
      createdAt: true,
      service: {
        select: {
          name: true,
          translations: true,
          canCancel: true,
          canRefill: true,
          hasDripfeed: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serializedOrders = orders.map((order) => ({
    id: order.id,
    quantity: order.quantity,
    charge: Number(order.charge),
    status: order.status,
    error: order.error,
    link: order.link,
    startCount: order.startCount,
    remains: order.remains,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    refundedAmount:
      order.refundedAmount != null ? Number(order.refundedAmount) : null,
    providerStatus: order.providerStatus,
    lastRefillAt: order.lastRefillAt ? order.lastRefillAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    service: {
      name: getTranslatedName(
        order.service.name,
        order.service.translations as Record<string, { name?: string; description?: string }> | null,
        locale,
      ),
      canCancel: order.service.canCancel,
      canRefill: order.service.canRefill,
      hasDripfeed: order.service.hasDripfeed,
    },
  }));

  return <DashboardOrdersClient locale={locale} orders={serializedOrders} />;
}
