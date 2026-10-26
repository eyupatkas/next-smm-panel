import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const limit = 50;
  const status = request.nextUrl.searchParams.get("status") || undefined;

  const where = status
    ? { status: status as "PENDING" | "SENT" | "COMPLETED" | "REJECTED" | "FAILED" }
    : {};

  const [items, total] = await Promise.all([
    db.refillRequest.findMany({
      where,
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
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.refillRequest.count({ where }),
  ]);

  const stats = await db.refillRequest.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return NextResponse.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: Object.fromEntries(stats.map((s) => [s.status, s._count.status])),
  });
}
