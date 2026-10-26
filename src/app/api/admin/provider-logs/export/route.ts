import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";

function csvEscape(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const filter = request.nextUrl.searchParams.get("filter") || "all";
  const provider = request.nextUrl.searchParams.get("provider") || "all";
  const from = request.nextUrl.searchParams.get("from") || "";
  const to = request.nextUrl.searchParams.get("to") || "";

  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59`) : null;

  const rows = await db.order.findMany({
    where: {
      service: {
        providerId: {
          ...(provider === "all" ? { not: null } : { equals: provider }),
        },
      },
      ...(fromDate || toDate
        ? {
            updatedAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...(filter === "errors"
        ? { error: { not: null } }
        : filter === "partial"
          ? { status: "PARTIAL" as const }
          : filter === "canceled"
            ? { status: "CANCELED" as const }
            : {
                OR: [{ error: { not: null } }, { apiOrderId: { not: null } }],
              }),
    },
    select: {
      id: true,
      status: true,
      apiOrderId: true,
      error: true,
      charge: true,
      quantity: true,
      remains: true,
      startCount: true,
      updatedAt: true,
      service: {
        select: {
          name: true,
          externalId: true,
          provider: { select: { name: true } },
        },
      },
      user: { select: { email: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  const header = [
    "order_id",
    "updated_at",
    "user_email",
    "service_name",
    "provider_name",
    "external_id",
    "api_order_id",
    "status",
    "charge",
    "quantity",
    "start_count",
    "remains",
    "error",
  ];

  const body = rows.map((row) =>
    [
      row.id,
      row.updatedAt.toISOString(),
      row.user.email,
      row.service.name,
      row.service.provider?.name,
      row.service.externalId,
      row.apiOrderId,
      row.status,
      row.charge,
      row.quantity,
      row.startCount,
      row.remains,
      row.error,
    ]
      .map(csvEscape)
      .join(",")
  );

  return new NextResponse([header.join(","), ...body].join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="provider-logs.csv"',
    },
  });
}