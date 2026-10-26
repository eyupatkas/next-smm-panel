import { db } from "@/lib/db";
import { AdminScheduledOrdersClient } from "@/components/admin/AdminScheduledOrdersClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Zamanlanmış Sipariş Yönetimi" };

export default async function AdminScheduledOrdersPage() {
  const [scheduledOrders, stats] = await Promise.all([
    db.scheduledOrder.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.scheduledOrder.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const statMap = Object.fromEntries(stats.map((s) => [s.status, s._count.status]));

  const serialized = scheduledOrders.map((o) => ({
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
    executedOrderIds: o.executedOrderIds,
    note: o.note,
    createdAt: o.createdAt.toISOString(),
    serviceName: o.service.name,
    user: o.user,
  }));

  return <AdminScheduledOrdersClient scheduledOrders={serialized} stats={statMap} />;
}
