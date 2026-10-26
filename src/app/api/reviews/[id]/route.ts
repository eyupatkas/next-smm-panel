import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { refreshServiceRatingDenormalized } from "@/lib/reviews";

export const runtime = "nodejs";

async function ensureAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: { approved?: boolean; flagged?: boolean } = {};
  if (typeof body.approved === "boolean") data.approved = body.approved;
  if (typeof body.flagged === "boolean") data.flagged = body.flagged;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const updated = await db.serviceReview.update({
    where: { id },
    data,
    select: { serviceId: true },
  });

  await refreshServiceRatingDenormalized(updated.serviceId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { id } = await params;
  const review = await db.serviceReview.findUnique({
    where: { id },
    select: { serviceId: true },
  });
  if (!review) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await db.serviceReview.delete({ where: { id } });
  await refreshServiceRatingDenormalized(review.serviceId);

  return NextResponse.json({ ok: true });
}
