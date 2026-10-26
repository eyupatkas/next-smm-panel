import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminFinanceClient } from "@/components/admin/AdminFinanceClient";

export const metadata: Metadata = { title: "Finans / Ödemeler" };

export default async function AdminFinancePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  // Fetch last 200 payments for initial load
  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      externalId: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Aggregate stats
  const [totalRevenue, totalFailed, totalPending] = await Promise.all([
    db.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    db.payment.count({ where: { status: "FAILED" } }),
    db.payment.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
  ]);

  // Order revenue
  const orderRevenue = await db.order.aggregate({
    where: { status: { in: ["COMPLETED", "PARTIAL", "PROCESSING"] } },
    _sum: { charge: true },
  });

  const stats = {
    totalRevenue: totalRevenue._sum.amount ?? 0,
    failedCount: totalFailed,
    pendingAmount: totalPending._sum.amount ?? 0,
    pendingCount: totalPending._count,
    orderRevenue: orderRevenue._sum.charge ?? 0,
  };

  return (
    <AdminFinanceClient
      initialPayments={payments.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      }))}
      stats={stats}
    />
  );
}
