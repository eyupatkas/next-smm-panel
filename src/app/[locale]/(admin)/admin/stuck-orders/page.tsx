import { db } from "@/lib/db";
import { AdminStuckOrdersClient } from "@/components/admin/AdminStuckOrdersClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Askıda Siparişler" };

export const dynamic = "force-dynamic";

export default async function AdminStuckOrdersPage() {
  const [orders, stats] = await Promise.all([
    db.order.findMany({
      where: {
        stuckAt: { not: null },
        status: { in: ["PENDING", "PROCESSING"] },
      },
      select: {
        id: true,
        status: true,
        charge: true,
        quantity: true,
        remains: true,
        startCount: true,
        link: true,
        apiOrderId: true,
        providerStatus: true,
        providerSyncError: true,
        stuckAt: true,
        stuckReason: true,
        createdAt: true,
        error: true,
        user: { select: { id: true, name: true, email: true } },
        service: {
          select: {
            name: true,
            canCancel: true,
            provider: { select: { name: true } },
          },
        },
      },
      orderBy: { stuckAt: "desc" },
      take: 200,
    }),
    db.order.aggregate({
      where: {
        stuckAt: { not: null },
        status: { in: ["PENDING", "PROCESSING"] },
      },
      _count: { id: true },
      _sum: { charge: true },
    }),
  ]);

  const serialized = orders.map((order) => ({
    id: order.id,
    shortId: order.id.slice(-8).toUpperCase(),
    status: order.status,
    charge: order.charge,
    quantity: order.quantity,
    remains: order.remains,
    startCount: order.startCount,
    link: order.link,
    apiOrderId: order.apiOrderId,
    providerStatus: order.providerStatus,
    providerSyncError: order.providerSyncError,
    stuckAt: order.stuckAt?.toISOString() ?? null,
    stuckReason: order.stuckReason,
    createdAt: order.createdAt.toISOString(),
    cancelRequested: order.error === "cancel_requested" || order.providerStatus === "CANCEL_REQUESTED",
    canCancel: order.service.canCancel,
    serviceName: order.service.name,
    providerName: order.service.provider?.name ?? null,
    user: order.user,
  }));

  return (
    <AdminStuckOrdersClient
      orders={serialized}
      stats={{
        count: stats._count.id,
        totalCharge: Number((stats._sum.charge ?? 0).toFixed(2)),
      }}
    />
  );
}
