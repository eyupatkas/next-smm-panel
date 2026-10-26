import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";

/**
 * POST /api/admin/services/bulk-price
 * Toplu servis fiyat güncelleme
 *
 * Body:
 *   percent: number          — yüzdesel değişim (+artış, -indirim)
 *   target: "retail" | "reseller" | "both"
 *   scope:  "all" | "category" | "provider"
 *   categoryId?: string      — scope=category iken zorunlu
 *   categoryIds?: string[]   — birleşik kategori filtresi için opsiyonel ID listesi
 *   providerId?: string      — scope=provider iken zorunlu
 *   preview?: boolean        — true ise sadece etkilenecek servis sayısını döner
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const body = await req.json();
  const percent = Number(body.percent);
  const target: "retail" | "reseller" | "both" = body.target ?? "both";
  const scope: "all" | "category" | "provider" = body.scope ?? "all";
  const categoryId: string | undefined = body.categoryId || undefined;
  const categoryIds: string[] = Array.isArray(body.categoryIds)
    ? body.categoryIds.filter((id: unknown) => typeof id === "string" && id.length > 0)
    : [];
  const providerId: string | undefined = body.providerId || undefined;
  const preview: boolean = body.preview === true;

  if (!Number.isFinite(percent) || percent === 0) {
    return NextResponse.json({ error: "Geçerli bir yüzde değeri giriniz." }, { status: 400 });
  }
  if (percent < -99 || percent > 10000) {
    return NextResponse.json({ error: "Yüzde değeri -99 ile 10000 arasında olmalıdır." }, { status: 400 });
  }
  if (!["retail", "reseller", "both"].includes(target)) {
    return NextResponse.json({ error: "Geçersiz hedef." }, { status: 400 });
  }
  if (scope === "category" && !categoryId) {
    return NextResponse.json({ error: "Kategori seçiniz." }, { status: 400 });
  }
  if (scope === "provider" && !providerId) {
    return NextResponse.json({ error: "Sağlayıcı seçiniz." }, { status: 400 });
  }

  const where: Record<string, unknown> = { status: true };
  if (scope === "category" && categoryId) {
    where.categoryId = categoryIds.length > 0 ? { in: categoryIds } : categoryId;
  }
  if (scope === "provider" && providerId) where.providerId = providerId;

  if (preview) {
    const count = await db.service.count({ where });
    return NextResponse.json({ ok: true, count });
  }

  // Tüm etkilen servisleri çek
  const services = await db.service.findMany({
    where,
    select: { id: true, retailPrice: true, resellerPrice: true },
  });

  const multiplier = 1 + percent / 100;
  let updated = 0;

  // Batch güncelleme (her biri tek sorgu yapmak yerine upsert benzeri loop)
  // Prisma updateMany ile expression-based update desteği olmadığından loop
  const BATCH = 200;
  for (let i = 0; i < services.length; i += BATCH) {
    const slice = services.slice(i, i + BATCH);
    await Promise.all(
      slice.map((svc) => {
        const data: Record<string, number | null> = {};
        if (target === "retail" || target === "both") {
          if (svc.retailPrice != null) {
            data.retailPrice = Number((svc.retailPrice * multiplier).toFixed(6));
          }
        }
        if (target === "reseller" || target === "both") {
          if (svc.resellerPrice != null) {
            data.resellerPrice = Number((svc.resellerPrice * multiplier).toFixed(6));
          }
        }
        if (Object.keys(data).length === 0) return Promise.resolve();
        return db.service.update({ where: { id: svc.id }, data });
      })
    );
    updated += slice.length;
  }

  revalidatePath("/admin/services");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/dashboard/reseller/pricing");

  return NextResponse.json({ ok: true, updated });
}
