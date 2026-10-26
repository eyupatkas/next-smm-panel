import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";

/**
 * POST /api/admin/services/bulk-status
 * Toplu servis durum güncelleme
 *
 * Body:
 *   ids: string[]     — güncellenecek servis ID'leri (max 500)
 *   status: boolean   — true=aktif, false=pasif
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown) => typeof id === "string" && id.length > 0)
    : [];
  const status = Boolean(body.status);

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids zorunludur." }, { status: 400 });
  }
  if (ids.length > 500) {
    return NextResponse.json({ error: "Maksimum 500 servis güncellenebilir." }, { status: 400 });
  }

  const updated = await db.service.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  revalidatePath("/admin/services");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/dashboard/services");

  return NextResponse.json({ ok: true, count: updated.count });
}
