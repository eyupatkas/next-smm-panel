import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncProviderOrdersBatch } from "@/lib/services/provider-order-sync";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.max(1, Math.min(100, Number(request.nextUrl.searchParams.get("limit") || 25) || 25));
  const result = await syncProviderOrdersBatch(limit);

  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: NextRequest) {
  return GET(request);
}