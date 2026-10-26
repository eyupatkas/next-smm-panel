import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";

export async function GET() {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const now = Date.now();
  const window45s = new Date(now - 45 * 1000);
  const window1h = new Date(now - 60 * 60 * 1000);
  const window5min = new Date(now - 5 * 60 * 1000);

  // Eski oturumları temizle (>1 saat)
  await db.activeSession.deleteMany({ where: { lastSeen: { lt: window1h } } });

  // Anlık online (son 45 saniye heartbeat)
  const [onlineCount, activeSessions, recentViews] = await Promise.all([
    db.activeSession.count({ where: { lastSeen: { gte: window45s } } }),
    db.activeSession.findMany({
      where: { lastSeen: { gte: window45s } },
      select: { path: true, lastSeen: true },
      orderBy: { lastSeen: "desc" },
    }),
    db.pageView.findMany({
      where: { createdAt: { gte: window5min } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { path: true, createdAt: true },
    }),
  ]);

  // Aktif sayfalara göre grupla
  const pageMap = new Map<string, number>();
  for (const s of activeSessions) {
    const key = s.path;
    pageMap.set(key, (pageMap.get(key) ?? 0) + 1);
  }
  const activePages = Array.from(pageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => ({ path, count }));

  return NextResponse.json({
    online: onlineCount,
    activePages,
    recentViews: recentViews.map((v) => ({
      path: v.path,
      createdAt: v.createdAt.toISOString(),
    })),
  });
}
