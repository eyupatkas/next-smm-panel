import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";

// Doğru Gelir Hesabı:
// - Gelir = Payment tablosundaki COMPLETED işlemler (gerçek nakit girişi)
//   - PAYTR: bakiye yükleme ödemeleri
//   - RETAIL_PAYTR / DASHBOARD_ORDER_PAYTR / DASHBOARD_MASS_PAYTR: direkt sipariş ödemeleri
//   - Bakiyeden yapılan siparişler sayılmaz — bakiye düşüşü sadece user.balance üzerinden olur
// - Maliyet = sağlayıcıya ödenen tahmini maliyet; adetlik paket servislerde price * quantity, diğerlerinde price / 1000 * quantity
// - Net Kar = Gelir - Maliyet

function fillDays(
  revenueMap: Map<string, number>,
  costMap: Map<string, number>,
  days: number
) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const revenue = revenueMap.get(key) ?? 0;
    const cost = costMap.get(key) ?? 0;
    return {
      label: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      profit: Number((revenue - cost).toFixed(2)),
    };
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(7, Number(searchParams.get("days") ?? 30)));

  // ── Günlük trend grafik verisi ────────────────────────────────────────
  const [chartRevRaw, chartCostRaw] = await Promise.all([
    db.$queryRaw<Array<{ day: Date; revenue: unknown }>>`
      SELECT
        DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC') AS day,
        SUM(amount) AS revenue
      FROM "Payment"
      WHERE status = 'COMPLETED'
        AND "createdAt" >= NOW() - (${days} || ' days')::INTERVAL
      GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')
      ORDER BY day
    `,
    db.$queryRaw<Array<{ day: Date; cost: unknown }>>`
      SELECT
        DATE_TRUNC('day', o."createdAt" AT TIME ZONE 'UTC') AS day,
        SUM(
          CASE
            WHEN (s.min = 1 AND s.max = 1) OR LOWER(COALESCE(s."serviceType", '')) LIKE '%package%'
              THEN s.price * o.quantity
            ELSE s.price / 1000.0 * o.quantity
          END
        ) AS cost
      FROM "Order" o
      JOIN "Service" s ON s.id = o."serviceId"
      WHERE o.status IN ('COMPLETED','PARTIAL','PROCESSING')
        AND o."createdAt" >= NOW() - (${days} || ' days')::INTERVAL
      GROUP BY DATE_TRUNC('day', o."createdAt" AT TIME ZONE 'UTC')
      ORDER BY day
    `,
  ]);

  const revenueMap = new Map(
    chartRevRaw.map((r) => [r.day.toISOString().slice(0, 10), Number(r.revenue ?? 0)])
  );
  const costMap = new Map(
    chartCostRaw.map((r) => [r.day.toISOString().slice(0, 10), Number(r.cost ?? 0)])
  );
  const chart = fillDays(revenueMap, costMap, days);

  // ── Dönem özetleri ────────────────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(Date.now() - 7 * 86400_000);
  const monthStart = new Date(Date.now() - 30 * 86400_000);

  type RevRow = { topup: unknown; direct: unknown };
  type CostRow = { cost: unknown; order_count: unknown };

  const [todayRev, weekRev, monthRev, allRev] = await Promise.all([
    db.$queryRaw<RevRow[]>`
      SELECT
        SUM(CASE WHEN method = 'PAYTR' THEN amount ELSE 0 END) AS topup,
        SUM(CASE WHEN method = ANY(ARRAY['RETAIL_PAYTR','DASHBOARD_ORDER_PAYTR','DASHBOARD_MASS_PAYTR']::text[]) THEN amount ELSE 0 END) AS direct
      FROM "Payment" WHERE status = 'COMPLETED' AND "createdAt" >= ${todayStart}
    `,
    db.$queryRaw<RevRow[]>`
      SELECT
        SUM(CASE WHEN method = 'PAYTR' THEN amount ELSE 0 END) AS topup,
        SUM(CASE WHEN method = ANY(ARRAY['RETAIL_PAYTR','DASHBOARD_ORDER_PAYTR','DASHBOARD_MASS_PAYTR']::text[]) THEN amount ELSE 0 END) AS direct
      FROM "Payment" WHERE status = 'COMPLETED' AND "createdAt" >= ${weekStart}
    `,
    db.$queryRaw<RevRow[]>`
      SELECT
        SUM(CASE WHEN method = 'PAYTR' THEN amount ELSE 0 END) AS topup,
        SUM(CASE WHEN method = ANY(ARRAY['RETAIL_PAYTR','DASHBOARD_ORDER_PAYTR','DASHBOARD_MASS_PAYTR']::text[]) THEN amount ELSE 0 END) AS direct
      FROM "Payment" WHERE status = 'COMPLETED' AND "createdAt" >= ${monthStart}
    `,
    db.$queryRaw<RevRow[]>`
      SELECT
        SUM(CASE WHEN method = 'PAYTR' THEN amount ELSE 0 END) AS topup,
        SUM(CASE WHEN method = ANY(ARRAY['RETAIL_PAYTR','DASHBOARD_ORDER_PAYTR','DASHBOARD_MASS_PAYTR']::text[]) THEN amount ELSE 0 END) AS direct
      FROM "Payment" WHERE status = 'COMPLETED'
    `,
  ]);

  const [todayCost, weekCost, monthCost, allCost] = await Promise.all([
    db.$queryRaw<CostRow[]>`
      SELECT SUM(CASE WHEN (s.min = 1 AND s.max = 1) OR LOWER(COALESCE(s."serviceType", '')) LIKE '%package%' THEN s.price * o.quantity ELSE s.price / 1000.0 * o.quantity END) AS cost, COUNT(*) AS order_count
      FROM "Order" o JOIN "Service" s ON s.id = o."serviceId"
      WHERE o.status IN ('COMPLETED','PARTIAL','PROCESSING') AND o."createdAt" >= ${todayStart}
    `,
    db.$queryRaw<CostRow[]>`
      SELECT SUM(CASE WHEN (s.min = 1 AND s.max = 1) OR LOWER(COALESCE(s."serviceType", '')) LIKE '%package%' THEN s.price * o.quantity ELSE s.price / 1000.0 * o.quantity END) AS cost, COUNT(*) AS order_count
      FROM "Order" o JOIN "Service" s ON s.id = o."serviceId"
      WHERE o.status IN ('COMPLETED','PARTIAL','PROCESSING') AND o."createdAt" >= ${weekStart}
    `,
    db.$queryRaw<CostRow[]>`
      SELECT SUM(CASE WHEN (s.min = 1 AND s.max = 1) OR LOWER(COALESCE(s."serviceType", '')) LIKE '%package%' THEN s.price * o.quantity ELSE s.price / 1000.0 * o.quantity END) AS cost, COUNT(*) AS order_count
      FROM "Order" o JOIN "Service" s ON s.id = o."serviceId"
      WHERE o.status IN ('COMPLETED','PARTIAL','PROCESSING') AND o."createdAt" >= ${monthStart}
    `,
    db.$queryRaw<CostRow[]>`
      SELECT SUM(CASE WHEN (s.min = 1 AND s.max = 1) OR LOWER(COALESCE(s."serviceType", '')) LIKE '%package%' THEN s.price * o.quantity ELSE s.price / 1000.0 * o.quantity END) AS cost, COUNT(*) AS order_count
      FROM "Order" o JOIN "Service" s ON s.id = o."serviceId"
      WHERE o.status IN ('COMPLETED','PARTIAL','PROCESSING')
    `,
  ]);

  function toSummary(rev: RevRow[], cost: CostRow[]) {
    const topup = Number(rev[0]?.topup ?? 0);
    const direct = Number(rev[0]?.direct ?? 0);
    const revenue = topup + direct;
    const costVal = Number(cost[0]?.cost ?? 0);
    const profit = revenue - costVal;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return {
      revenue: Number(revenue.toFixed(2)),
      topupRevenue: Number(topup.toFixed(2)),
      directRevenue: Number(direct.toFixed(2)),
      cost: Number(costVal.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      margin: Number(margin.toFixed(1)),
      orderCount: Number(cost[0]?.order_count ?? 0),
    };
  }

  // ── En karlı servisler (son 30 gün, order.charge kullanılır) ─────────
  const topServicesRaw = await db.$queryRaw<
    Array<{ service_name: string; revenue: unknown; cost: unknown; order_count: unknown }>
  >`
    SELECT s.name AS service_name,
           SUM(o.charge) AS revenue,
           SUM(CASE WHEN (s.min = 1 AND s.max = 1) OR LOWER(COALESCE(s."serviceType", '')) LIKE '%package%' THEN s.price * o.quantity ELSE s.price / 1000.0 * o.quantity END) AS cost,
           COUNT(*) AS order_count
    FROM "Order" o
    JOIN "Service" s ON s.id = o."serviceId"
    WHERE o.status IN ('COMPLETED','PARTIAL','PROCESSING')
      AND o."createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY s.name
    ORDER BY (SUM(o.charge) - SUM(CASE WHEN (s.min = 1 AND s.max = 1) OR LOWER(COALESCE(s."serviceType", '')) LIKE '%package%' THEN s.price * o.quantity ELSE s.price / 1000.0 * o.quantity END)) DESC
    LIMIT 5
  `;

  const topServices = topServicesRaw.map((r) => {
    const revenue = Number(r.revenue ?? 0);
    const cost = Number(r.cost ?? 0);
    const profit = revenue - cost;
    return {
      name: r.service_name,
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      margin: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0,
      orderCount: Number(r.order_count ?? 0),
    };
  });

  return NextResponse.json({
    today: toSummary(todayRev, todayCost),
    week: toSummary(weekRev, weekCost),
    month: toSummary(monthRev, monthCost),
    all: toSummary(allRev, allCost),
    chart,
    topServices,
    days,
  });
}
