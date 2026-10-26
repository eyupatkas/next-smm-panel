import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { runProviderServiceSync } from "@/lib/services/provider-service-sync";

function isAuthorizedBySecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = request.headers.get("x-cron-key");
  return Boolean(provided && expected === provided);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin && !isAuthorizedBySecret(request)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const summary = await runProviderServiceSync();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("[service-sync-api] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
