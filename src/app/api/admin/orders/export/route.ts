import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";
import {
  parseAdminOrdersFilters,
  buildAdminOrdersWhere,
  buildAdminOrdersOrderBy,
  ADMIN_ORDER_EXPORT_LIMIT,
} from "@/lib/orders/admin-orders-query";

// GET /api/admin/orders/export?status=&q=&provider=&from=&to=&sort=&source=
// Mevcut filtrelerle eşleşen siparişleri CSV olarak indirir (en fazla 10.000 satır).
export async function GET(req: NextRequest) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const raw = req.nextUrl.searchParams;
  const params: Record<string, string> = {};
  raw.forEach((value, key) => { params[key] = value; });
  // Dışa aktarımda sayfalama anlamsız; tamamını çek
  delete params.page;

  const filters = parseAdminOrdersFilters(params);

  const orders = await db.order.findMany({
    where: buildAdminOrdersWhere(filters),
    select: {
      id: true,
      quantity: true,
      charge: true,
      status: true,
      link: true,
      apiOrderId: true,
      providerStatus: true,
      providerSyncError: true,
      refundedAmount: true,
      startCount: true,
      remains: true,
      createdAt: true,
      placedByAgent: true,
      service: { select: { name: true, externalId: true, provider: { select: { name: true } } } },
      user: { select: { email: true, role: true } },
    },
    orderBy: buildAdminOrdersOrderBy(filters.sort),
    take: ADMIN_ORDER_EXPORT_LIMIT,
  });

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const fmtDate = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);

  const header = [
    "Siparis ID", "Tarih", "Durum", "Kullanici", "Rol", "Servis", "Servis ID",
    "Saglayici", "Miktar", "Kalan", "Tutar", "Iade", "Baslangic Sayisi",
    "Link", "API Siparis No", "Saglayici Durumu", "Kaynak",
  ];

  const rows = orders.map((o) => [
    o.id,
    fmtDate(o.createdAt),
    o.status,
    o.user.email ?? "",
    o.user.role,
    o.service.name,
    o.service.externalId ?? "",
    o.service.provider?.name ?? "Manuel",
    o.quantity,
    o.remains,
    Number(o.charge).toFixed(4),
    o.refundedAmount != null ? Number(o.refundedAmount).toFixed(4) : "",
    o.startCount,
    o.link,
    o.apiOrderId ?? "",
    o.providerStatus ?? "",
    o.placedByAgent ? "Yapay Zeka" : "Manuel",
  ]);

  const csv =
    "\uFEFF" +
    [header, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="siparisler-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
