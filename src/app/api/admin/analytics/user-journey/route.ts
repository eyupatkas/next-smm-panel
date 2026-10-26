import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";
import { parseSource } from "@/lib/referrer-parser";

/** Bir kullanıcı veya oturum için ilk harici geliş kaynağını dinamik bulur */
async function resolveEffectiveReferrer(
  rawReferrer: string | null | undefined,
  sessionId?: string | null,
  createdAt?: Date
): Promise<string> {
  const parsed = parseSource(rawReferrer);
  if (parsed !== "Direkt / Bilinmiyor") {
    return parsed;
  }

  // 1. SessionId ile PageView'lardan ara
  if (sessionId) {
    const pv = await db.pageView.findFirst({
      where: { sessionId, referrer: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { referrer: true }
    });
    if (pv?.referrer) {
      const p = parseSource(pv.referrer);
      if (p !== "Direkt / Bilinmiyor") return p;
    }
  }

  // 2. Zaman aralığı ile PageView'lardan ara
  if (createdAt) {
    const windowStart = new Date(createdAt.getTime() - 30 * 60 * 1000);
    const pv = await db.pageView.findFirst({
      where: {
        createdAt: { gte: windowStart, lte: createdAt },
        referrer: { not: null }
      },
      orderBy: { createdAt: "asc" },
      select: { referrer: true }
    });
    if (pv?.referrer) {
      const p = parseSource(pv.referrer);
      if (p !== "Direkt / Bilinmiyor") return p;
    }
  }

  return "Direkt / Bilinmiyor";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "30d";
  const email = searchParams.get("email") ?? "";

  const days = range === "7d" ? 7 : range === "12m" ? 365 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // ── 1. Kaynak bazlı kayıt sayıları ──────────────────────────────
  const signupEvents = await db.userEvent.findMany({
    where: { type: "signup", createdAt: { gte: since } },
    select: { referrer: true, createdAt: true, userId: true, sessionId: true },
  });

  // Kaynak grupla
  const sourceMap = new Map<string, { signups: number; orders: number }>();
  for (const ev of signupEvents) {
    const src = await resolveEffectiveReferrer(ev.referrer, ev.sessionId, ev.createdAt);
    if (!sourceMap.has(src)) sourceMap.set(src, { signups: 0, orders: 0 });
    sourceMap.get(src)!.signups++;
  }

  // ── 2. Sipariş dönüşümleri kaynak bazlı ─────────────────────────
  const orderEvents = await db.userEvent.findMany({
    where: { type: "order", createdAt: { gte: since } },
    select: { referrer: true, createdAt: true, userId: true, meta: true, sessionId: true },
  });
  for (const ev of orderEvents) {
    const src = await resolveEffectiveReferrer(ev.referrer, ev.sessionId, ev.createdAt);
    if (!sourceMap.has(src)) sourceMap.set(src, { signups: 0, orders: 0 });
    sourceMap.get(src)!.orders++;
  }

  const sources = Array.from(sourceMap.entries())
    .map(([source, counts]) => ({ source, ...counts }))
    .sort((a, b) => b.signups - a.signups);

  // ── 3. Günlük dönüşüm trendi ─────────────────────────────────────
  const allEvents = [...signupEvents, ...orderEvents].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  const dailyMap = new Map<string, { signups: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    dailyMap.set(d.toISOString().slice(0, 10), { signups: 0, orders: 0 });
  }
  for (const ev of allEvents) {
    const key = ev.createdAt.toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      const isOrder = orderEvents.some((o) => o === ev);
      if (isOrder) dailyMap.get(key)!.orders++;
      else dailyMap.get(key)!.signups++;
    }
  }
  const trend = Array.from(dailyMap.entries()).map(([date, v]) => ({
    label: new Date(date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    ...v,
  }));

  // ── 4. Özet sayılar ──────────────────────────────────────────────
  const totalSignups = signupEvents.length;
  const totalOrders = orderEvents.length;
  const conversionRate =
    totalSignups > 0 ? ((totalOrders / totalSignups) * 100).toFixed(1) : "0.0";

  // ── 5. Kullanıcı arama (e-posta ile) ─────────────────────────────
  let userJourney: {
    user: { id: string; name: string | null; email: string | null; createdAt: Date } | null;
    events: Array<{ type: string; referrer: string | null; landingPage: string | null; meta: unknown; createdAt: Date }>;
    orderCount: number;
  } | null = null;

  if (email.trim()) {
    const user = await db.user.findFirst({
      where: { email: { contains: email.trim(), mode: "insensitive" } },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (user) {
      const [events, orderCount] = await Promise.all([
        db.userEvent.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
          select: { type: true, referrer: true, landingPage: true, meta: true, createdAt: true },
        }),
        db.order.count({ where: { userId: user.id } }),
      ]);
      userJourney = { user, events, orderCount };
    } else {
      userJourney = { user: null, events: [], orderCount: 0 };
    }
  }

  // ── 6. Son kayıt olan kullanıcılar ──────────────────────────────
  const recentUsers = await db.user.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  const recentWithUser = await Promise.all(
    recentUsers.map(async (u) => {
      const ev = await db.userEvent.findFirst({
        where: { userId: u.id, type: "signup" },
        select: { referrer: true, landingPage: true, sessionId: true },
      });
      const source = await resolveEffectiveReferrer(ev?.referrer, ev?.sessionId, u.createdAt);
      return {
        createdAt: u.createdAt,
        referrer: ev?.referrer ?? null,
        landingPage: ev?.landingPage ?? null,
        userId: u.id,
        source,
        userName: u.name ?? "-",
        userEmail: u.email ?? "-",
      };
    })
  );

  return NextResponse.json({
    sources,
    trend,
    summary: { totalSignups, totalOrders, conversionRate },
    recentSignups: recentWithUser,
    userJourney,
  });
}
