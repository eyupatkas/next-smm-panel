import { db } from "@/lib/db";
import { AdminRefillsClient } from "@/components/admin/AdminRefillsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Telafi Yönetimi" };

export default async function AdminRefillsPage() {
  const [refills, stats] = await Promise.all([
    db.refillRequest.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: {
          select: {
            id: true,
            status: true,
            quantity: true,
            charge: true,
            apiOrderId: true,
            link: true,
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
      take: 200,
    }),
    db.refillRequest.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const statMap = Object.fromEntries(stats.map((s) => [s.status, s._count.status]));

  const serialized = refills.map((r) => ({
    id: r.id,
    status: r.status,
    providerRefillId: r.providerRefillId,
    adminNote: r.adminNote,
    requestedAt: r.requestedAt.toISOString(),
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    user: r.user,
    order: {
      id: r.order.id,
      status: r.order.status,
      quantity: r.order.quantity,
      charge: r.order.charge,
      apiOrderId: r.order.apiOrderId,
      link: r.order.link,
      serviceName: r.order.service.name,
    },
  }));

  return <AdminRefillsClient refills={serialized} stats={statMap} />;
}
