import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import AdminOrdersClient from "@/components/admin/AdminOrdersClient";
import { getPricingMode } from "@/lib/pricing";
import {
  parseAdminOrdersFilters,
  buildAdminOrdersWhere,
  buildAdminOrdersBaseWhere,
  buildAdminOrdersOrderBy,
  statusTabCondition,
} from "@/lib/orders/admin-orders-query";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const filters = parseAdminOrdersFilters(params);

  const where = buildAdminOrdersWhere(filters);
  const baseWhere = buildAdminOrdersBaseWhere(filters);

  // Önce say: aralık aşımı halinde boş sayfa yerine geçerli sayfaya kırp
  const [filteredTotal, allTimeTotal] = await Promise.all([
    db.order.count({ where }),
    db.order.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredTotal / filters.perPage));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);

  const [
    orders,
    statusGroups,
    notSentCount,
    canceledWithRefundCount,
    aggregates,
    providers,
  ] = await Promise.all([
    db.order.findMany({
      where,
      select: {
        id: true,
        serviceId: true,
        quantity: true,
        charge: true,
        status: true,
        link: true,
        apiOrderId: true,
        error: true,
        providerStatus: true,
        providerRawStatus: true,
        providerSentAt: true,
        providerLastCheckedAt: true,
        providerSyncError: true,
        refundedAmount: true,
        startCount: true,
        remains: true,
        createdAt: true,
        placedByAgent: true,
        service: { select: { name: true, externalId: true, provider: { select: { name: true, status: true } }, price: true, retailPrice: true, resellerPrice: true, min: true, max: true, serviceType: true } },
        user: { select: { email: true, role: true } },
      },
      orderBy: buildAdminOrdersOrderBy(filters.sort),
      skip: (currentPage - 1) * filters.perPage,
      take: filters.perPage,
    }),
    db.order.groupBy({ by: ["status"], _count: { _all: true }, where: baseWhere }),
    db.order.count({ where: { AND: [baseWhere, statusTabCondition("NOT_SENT")!] } }),
    db.order.count({
      where: {
        AND: [
          baseWhere,
          { status: "CANCELED", refundedAmount: { gt: 0 } },
        ],
      },
    }),
    db.order.aggregate({
      where,
      _sum: { charge: true, refundedAmount: true },
    }),
    db.provider.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // ── Sekme sayıları ──────────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = { ALL: filteredTotal };
  for (const g of statusGroups) statusCounts[g.status] = g._count._all;
  // CANCELED: yalnızca iadesiz iptaller; REFUNDED: REFUNDED + iadeli iptaller
  const totalCanceled = statusCounts.CANCELED ?? 0;
  const statusRefunded = statusCounts.REFUNDED ?? 0;
  statusCounts.CANCELED = Math.max(0, totalCanceled - canceledWithRefundCount);
  statusCounts.REFUNDED = statusRefunded + canceledWithRefundCount;
  statusCounts.NOT_SENT = notSentCount;

  // ── Paket adları (sayfadaki servisler için) ─────────────────────────────────
  const serviceIds = Array.from(new Set(orders.map((order) => order.serviceId)));
  const packages = serviceIds.length
    ? await db.package.findMany({
        where: { status: true, serviceId: { in: serviceIds } },
        select: { serviceId: true, quantity: true, name: true },
      })
    : [];
  const packageNameByKey = new Map(
    packages.map((pkg) => [`${pkg.serviceId}:${pkg.quantity}`, pkg.name]),
  );

  // ── Kombo ödemeleri: yalnızca sayfadaki siparişleri içerenler ───────────────
  const orderIds = orders.map((o) => o.id);
  const comboPayments = orderIds.length
    ? await db.payment.findMany({
        where: {
          method: "RETAIL_PAYTR",
          status: "COMPLETED",
          externalId: { startsWith: "COMBO:" },
          OR: orderIds.map((id) => ({ externalId: { contains: id } })),
        },
        select: { id: true, amount: true, externalId: true },
      })
    : [];

  type ComboGroup = { paymentId: string; totalAmount: number; orderIds: string[] };
  const comboGroupByOrderId = new Map<string, ComboGroup>();
  for (const p of comboPayments) {
    const ids = (p.externalId ?? "").slice(6).split(",").filter(Boolean);
    const group: ComboGroup = { paymentId: p.id, totalAmount: Number(p.amount), orderIds: ids };
    for (const id of ids) comboGroupByOrderId.set(id, group);
  }

  const sumCharge = Number(aggregates._sum.charge ?? 0);
  const sumRefunded = Number(aggregates._sum.refundedAmount ?? 0);

  return (
    <AdminOrdersClient
      orders={orders.map((order) => {
        const combo = comboGroupByOrderId.get(order.id) ?? null;
        return {
          ...order,
          charge: Number(order.charge),
          refundedAmount: order.refundedAmount != null ? Number(order.refundedAmount) : null,
          createdAt: order.createdAt.toISOString(),
          providerSentAt: order.providerSentAt?.toISOString() ?? null,
          providerLastCheckedAt: order.providerLastCheckedAt?.toISOString() ?? null,
          packageName: packageNameByKey.get(`${order.serviceId}:${order.quantity}`) ?? order.service.name,
          costPrice: order.service.price,
          costPricingMode: getPricingMode(order.service),
          retailPrice: order.service.retailPrice,
          resellerPrice: order.service.resellerPrice,
          paymentMethod: combo ? "RETAIL_PAYTR" : null,
          comboGroupId: combo?.paymentId ?? null,
          comboTotalAmount: combo?.totalAmount ?? null,
          comboOrderIds: combo?.orderIds ?? null,
        };
      })}
      providers={providers}
      filters={{ ...filters, page: currentPage }}
      pagination={{ page: currentPage, perPage: filters.perPage, total: filteredTotal, totalPages }}
      stats={{
        allTimeTotal,
        sumCharge,
        sumRefunded,
        avgCharge: filteredTotal > 0 ? sumCharge / filteredTotal : 0,
      }}
      statusCounts={statusCounts}
      locale={locale}
    />
  );
}
