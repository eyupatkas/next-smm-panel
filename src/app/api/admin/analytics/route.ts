import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";

type RawRow = { date: Date; pageviews: bigint; unique: bigint };

/** Verilen gün sayısı için geriye dönük günlük zaman dizisi oluştur */
function fillDays(rows: RawRow[], days: number) {
  const map = new Map<string, RawRow>();
  for (const r of rows) {
    map.set(r.date.toISOString().slice(0, 10), r);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    const r = map.get(key);
    return {
      label: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      pageviews: r ? Number(r.pageviews) : 0,
      unique: r ? Number(r.unique) : 0,
    };
  });
}

/** Verilen ay sayısı için geriye dönük aylık zaman dizisi oluştur */
function fillMonths(rows: RawRow[], months: number) {
  const map = new Map<string, RawRow>();
  for (const r of rows) {
    map.set(r.date.toISOString().slice(0, 7), r);
  }
  return Array.from({ length: months }, (_, i) => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - (months - 1 - i), 1);
    const key = d.toISOString().slice(0, 7);
    const r = map.get(key);
    return {
      label: d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }),
      pageviews: r ? Number(r.pageviews) : 0,
      unique: r ? Number(r.unique) : 0,
    };
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "7d";

  // Eski aktif oturumları temizle (>1 saat)
  await db.activeSession.deleteMany({
    where: { lastSeen: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
  });

  // Anlık online (son 45 saniye heartbeat)
  const online = await db.activeSession.count({
    where: { lastSeen: { gte: new Date(Date.now() - 45 * 1000) } },
  });

  // Son 24 saatte aktif tekil ziyaretçi
  const active24hRows = await db.$queryRaw<[{ cnt: bigint }]>`
    SELECT COUNT(DISTINCT "sessionId") AS cnt FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
  `;
  const active24h = Number(active24hRows[0]?.cnt ?? 0);

  // Bugünkü istatistikler — Türkiye saati gece yarısından itibaren (UTC+3)
  // Türkiye DST uygulamaz, kalıcı olarak UTC+3'tedir.
  const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const turkeyNow = new Date(nowMs + TZ_OFFSET_MS);
  const todayStart = new Date(
    Date.UTC(turkeyNow.getUTCFullYear(), turkeyNow.getUTCMonth(), turkeyNow.getUTCDate()) - TZ_OFFSET_MS
  );

  const todayRows = await db.$queryRaw<
    [{ pageviews: bigint; unique: bigint }]
  >`
    SELECT
      COUNT(*) AS pageviews,
      COUNT(DISTINCT "sessionId") AS unique
    FROM "PageView"
    WHERE "createdAt" >= ${todayStart}
  `;
  const todayPageviews = Number(todayRows[0]?.pageviews ?? 0);
  const todayUnique = Number(todayRows[0]?.unique ?? 0);

  // Toplam tüm zamanlı istatistikler
  const totalRows = await db.$queryRaw<
    [{ pageviews: bigint; unique: bigint }]
  >`
    SELECT COUNT(*) AS pageviews, COUNT(DISTINCT "sessionId") AS unique FROM "PageView"
  `;
  const totalPageviews = Number(totalRows[0]?.pageviews ?? 0);
  const totalUnique = Number(totalRows[0]?.unique ?? 0);

  // Grafik verisi
  let chart: Array<{ label: string; pageviews: number; unique: number }> = [];

  if (range === "7d") {
    const rows = await db.$queryRaw<RawRow[]>`
      SELECT
        DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC') AS date,
        COUNT(*) AS pageviews,
        COUNT(DISTINCT "sessionId") AS unique
      FROM "PageView"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')
      ORDER BY date
    `;
    chart = fillDays(rows, 7);
  } else if (range === "30d") {
    const rows = await db.$queryRaw<RawRow[]>`
      SELECT
        DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC') AS date,
        COUNT(*) AS pageviews,
        COUNT(DISTINCT "sessionId") AS unique
      FROM "PageView"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')
      ORDER BY date
    `;
    chart = fillDays(rows, 30);
  } else if (range === "12m") {
    const rows = await db.$queryRaw<RawRow[]>`
      SELECT
        DATE_TRUNC('month', "createdAt" AT TIME ZONE 'UTC') AS date,
        COUNT(*) AS pageviews,
        COUNT(DISTINCT "sessionId") AS unique
      FROM "PageView"
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "createdAt" AT TIME ZONE 'UTC')
      ORDER BY date
    `;
    chart = fillMonths(rows, 12);
  }

  // Zaman aralığı için başlangıç tarihi hesapla
  const rangeSince = range === "7d"
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : range === "30d"
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  // En çok ziyaret edilen sayfalar (seçilen range'e göre)
  const topPagesRaw = await db.$queryRaw<Array<{ path: string; count: bigint }>>`
    SELECT path, COUNT(*) AS count
    FROM "PageView"
    WHERE "createdAt" >= ${rangeSince}
    GROUP BY path
    ORDER BY count DESC
    LIMIT 10
  `;
  const topPages = topPagesRaw.map((r) => ({
    path: r.path,
    count: Number(r.count),
  }));

  // En çok trafik gelen referrer'lar (seçilen range'e göre)
  const topReferrersRaw = await db.$queryRaw<
    Array<{ referrer: string; count: bigint }>
  >`
    SELECT referrer, COUNT(*) AS count
    FROM "PageView"
    WHERE referrer IS NOT NULL
      AND referrer != ''
      AND "createdAt" >= ${rangeSince}
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT 8
  `;
  const topReferrers = topReferrersRaw.map((r) => ({
    referrer: r.referrer,
    count: Number(r.count),
  }));

  // Dönem bazlı istatistikler (yeni kullanıcılar, sipariş sayısı, gelir)
  const [rangeUsersRaw, rangeOrdersRaw, rangeRevenueRaw] = await Promise.all([
    db.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*) AS cnt FROM "User"
      WHERE "createdAt" >= ${rangeSince}
    `,
    db.$queryRaw<[{ cnt: bigint; revenue: string }]>`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(charge), 0)::text AS revenue FROM "Order"
      WHERE "createdAt" >= ${rangeSince}
        AND status NOT IN ('CANCELED', 'REFUNDED')
    `,
    db.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(amount), 0)::text AS total FROM "Payment"
      WHERE "createdAt" >= ${rangeSince}
        AND status = 'COMPLETED'
    `,
  ]);

  const rangeStats = {
    users: Number(rangeUsersRaw[0]?.cnt ?? 0),
    orders: Number(rangeOrdersRaw[0]?.cnt ?? 0),
    orderRevenue: parseFloat(rangeOrdersRaw[0]?.revenue ?? "0"),
    payments: parseFloat(rangeRevenueRaw[0]?.total ?? "0"),
  };

  return NextResponse.json({
    online,
    active24h,
    today: { pageviews: todayPageviews, unique: todayUnique },
    total: { pageviews: totalPageviews, unique: totalUnique },
    chart,
    topPages,
    topReferrers,
    rangeStats,
  });
}
