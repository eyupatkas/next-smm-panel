import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";
import { adminResolveStuckOrder, type AdminStuckOrderAction } from "@/lib/services/provider-order-sync";

const VALID_ACTIONS: AdminStuckOrderAction[] = ["recheck", "cancel_provider", "cancel_refund", "mark_completed"];

export async function GET() {
  const session = (await auth()) as Session | null;
  const authError = requireAdmin(session);
  if (authError) return authError;

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

  return NextResponse.json({
    orders: orders.map((order) => ({
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
    })),
    stats: {
      count: stats._count.id,
      totalCharge: Number((stats._sum.charge ?? 0).toFixed(2)),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = (await auth()) as Session | null;
  const authError = requireAdmin(session);
  if (authError) return authError;

  try {
    const body = (await request.json()) as { orderId?: unknown; action?: unknown };
    const orderId = String(body.orderId ?? "").trim();
    const action = String(body.action ?? "").trim() as AdminStuckOrderAction;

    if (!orderId) {
      return NextResponse.json({ error: "Sipariş ID gerekli." }, { status: 400 });
    }
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Geçersiz aksiyon." }, { status: 400 });
    }

    const result = await adminResolveStuckOrder(orderId, action);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[AdminStuckOrders] Aksiyon hatası:", error);
    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}
