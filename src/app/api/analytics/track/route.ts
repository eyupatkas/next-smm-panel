import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  // Rate limit: her IP'den 60 saniyede 120 istek
  const ip = getClientIp(req);
  if (rateLimit(`analytics:${ip}`, 120, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { type, sessionId, path, referrer } = body;

    if (!type || !["pageview", "heartbeat"].includes(type)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (
      !sessionId ||
      typeof sessionId !== "string" ||
      !UUID_REGEX.test(sessionId)
    ) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (
      !path ||
      typeof path !== "string" ||
      !path.startsWith("/") ||
      path.length > 500
    ) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Admin rotaları hiçbir zaman kaydedilmez
    if (path.startsWith("/admin") || path.includes("/api/")) {
      return NextResponse.json({ ok: true });
    }

    const cleanReferrer =
      referrer &&
      typeof referrer === "string" &&
      referrer.length > 0 &&
      referrer.length <= 500
        ? referrer.slice(0, 500)
        : null;

    if (type === "pageview") {
      await db.pageView.create({
        data: {
          path: path.slice(0, 500),
          referrer: cleanReferrer,
          sessionId,
        },
      });
    } else {
      // heartbeat – upsert active session
      await db.activeSession.upsert({
        where: { sessionId },
        update: { path: path.slice(0, 500), lastSeen: new Date() },
        create: { sessionId, path: path.slice(0, 500) },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
