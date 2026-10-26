"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { calculateSafeServiceCharge } from "@/lib/pricing";
import { applyUserMoneyDelta } from "@/lib/money";
import { getEffectiveAvailableBalance } from "@/lib/services/dashboard-checkout";
import { getVatRate } from "@/lib/settings";

/* ─── Types ──────────────────────────────────────────────── */

export type CreateScheduledOrderState = {
  success?: string;
  orderId?: string;
  error?: string;
};

export type CancelScheduledOrderState = {
  success?: string;
  error?: string;
};

/* ─── Create Scheduled Order ─────────────────────────────── */

export async function createScheduledOrder(
  _prevState: CreateScheduledOrderState,
  formData: FormData
): Promise<CreateScheduledOrderState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const serviceId = String(formData.get("serviceId") || "").trim();
  const link = String(formData.get("link") || "").trim();
  const quantity = parseInt(String(formData.get("quantity") || "0"), 10);
  const scheduledAtStr = String(formData.get("scheduledAt") || "").trim();
  const isRecurring = formData.get("isRecurring") === "true";
  const recurrenceEveryHours = isRecurring
    ? parseInt(String(formData.get("recurrenceEveryHours") || "24"), 10)
    : null;
  const recurrenceTimes = isRecurring
    ? parseInt(String(formData.get("recurrenceTimes") || "0"), 10) || null
    : null;
  const recurrenceEndAtStr = isRecurring
    ? String(formData.get("recurrenceEndAt") || "").trim()
    : null;
  const note = String(formData.get("note") || "").trim().slice(0, 500) || null;

  if (!serviceId || !link || !quantity || !scheduledAtStr) {
    return { error: "Servis, link, miktar ve planlanan tarih zorunludur." };
  }
  if (link.length > 500 || /[\u0000-\u001f]/.test(link)) {
    return { error: "Hedef bağlantı geçersiz veya çok uzun." };
  }

  const scheduledAt = new Date(scheduledAtStr);
  if (isNaN(scheduledAt.getTime())) {
    return { error: "Geçersiz tarih formatı." };
  }
  if (scheduledAt.getTime() <= Date.now()) {
    return { error: "Planlanan tarih gelecekte olmalıdır." };
  }

  const recurrenceEndAt =
    recurrenceEndAtStr ? new Date(recurrenceEndAtStr) : null;

  if (isRecurring) {
    if (!Number.isInteger(recurrenceEveryHours) || recurrenceEveryHours! < 1 || recurrenceEveryHours! > 8760) {
      return { error: "Tekrar aralığı 1 ile 8760 saat arasında olmalıdır." };
    }
    if (recurrenceTimes !== null && (!Number.isInteger(recurrenceTimes) || recurrenceTimes < 2 || recurrenceTimes > 1000)) {
      return { error: "Tekrar sayısı 2 ile 1000 arasında olmalıdır." };
    }
    if (recurrenceEndAt && (Number.isNaN(recurrenceEndAt.getTime()) || recurrenceEndAt <= scheduledAt)) {
      return { error: "Bitiş tarihi planlanan tarihten sonra olmalıdır." };
    }
  }

  const [user, service] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, balance: true, role: true, banned: true },
    }),
    db.service.findFirst({
      where: { id: serviceId, status: true },
      select: {
        id: true,
        name: true,
        min: true,
        max: true,
        price: true,
        retailPrice: true,
        resellerPrice: true,
        serviceType: true,
        provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
      },
    }),
  ]);

  if (!user) return { error: "Kullanıcı bulunamadı." };
  if (user.banned) return { error: "Hesabınız askıya alındı." };
  if (!service) return { error: "Servis bulunamadı veya pasif." };

  if (quantity < service.min || quantity > service.max) {
    return { error: `Miktar ${service.min}–${service.max} arasında olmalıdır.` };
  }

  const charge = calculateSafeServiceCharge(user.role, service, quantity, undefined, await getVatRate()).charge;

  const availableBalance = await getEffectiveAvailableBalance(db, user.id, Number(user.balance));
  if (availableBalance < charge) {
    return {
      error: `Yetersiz bakiye. Gerekli: ${charge.toFixed(2)} TL, Kullanılabilir: ${availableBalance.toFixed(2)} TL.`,
    };
  }

  // Deduct balance at creation (reserve)
  let scheduled: { id: string };
  try {
    scheduled = await db.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ balance: number }>>`
        SELECT balance FROM "User" WHERE id = ${user.id} FOR UPDATE
      `;
      if (!lockedUsers[0] || (await getEffectiveAvailableBalance(tx, user.id, Number(lockedUsers[0].balance))) < charge) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

    const created = await tx.scheduledOrder.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        link,
        quantity,
        charge,
        scheduledAt,
        nextRunAt: scheduledAt,
        isRecurring,
        recurrenceEveryHours: recurrenceEveryHours ?? null,
        recurrenceTimes: recurrenceTimes ?? null,
        recurrenceEndAt: recurrenceEndAt ?? null,
        note,
        status: "PENDING",
      },
      select: { id: true },
    });

    // Reserve balance
    await applyUserMoneyDelta(tx, user.id, { balance: -charge });

    return created;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return { error: "Yetersiz bakiye. Lütfen bakiyenizi kontrol edip tekrar deneyin." };
    }
    throw error;
  }

  revalidatePath("/dashboard/scheduled");
  revalidatePath("/admin/scheduled-orders");

  return {
    success: `Zamanlanmış sipariş oluşturuldu (#${scheduled.id.slice(-8).toUpperCase()}).`,
    orderId: scheduled.id,
  };
}

/* ─── Cancel Scheduled Order ─────────────────────────────── */

export async function cancelScheduledOrder(
  _prevState: CancelScheduledOrderState,
  formData: FormData
): Promise<CancelScheduledOrderState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const scheduledOrderId = String(formData.get("scheduledOrderId") || "").trim();
  if (!scheduledOrderId) return { error: "Sipariş ID gerekli." };

  const canceled = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; charge: number; userId: string; status: string }>>`
      SELECT id, charge, "userId", status::text
      FROM "ScheduledOrder"
      WHERE id = ${scheduledOrderId} AND "userId" = ${session.user.id}
      FOR UPDATE
    `;
    const scheduled = rows[0];
    if (!scheduled || scheduled.status !== "PENDING") return false;

    await tx.scheduledOrder.update({
      where: { id: scheduled.id },
      data: { status: "CANCELED", updatedAt: new Date(), nextRunAt: null },
    });
    await applyUserMoneyDelta(tx, scheduled.userId, { balance: Number(scheduled.charge) });
    return true;
  });

  if (!canceled) return { error: "Sipariş bulunamadı veya iptal edilemez durumda." };

  revalidatePath("/dashboard/scheduled");
  revalidatePath("/admin/scheduled-orders");

  return { success: "Zamanlanmış sipariş iptal edildi. Bakiyeniz iade edildi." };
}

/* ─── Admin: Cancel any scheduled order ─────────────────── */

export async function adminCancelScheduledOrder(
  _prevState: CancelScheduledOrderState,
  formData: FormData
): Promise<CancelScheduledOrderState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Yetki yok." };
  }

  const scheduledOrderId = String(formData.get("scheduledOrderId") || "").trim();
  const canceled = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; charge: number; userId: string; status: string }>>`
      SELECT id, charge, "userId", status::text
      FROM "ScheduledOrder"
      WHERE id = ${scheduledOrderId}
      FOR UPDATE
    `;
    const scheduled = rows[0];
    if (!scheduled || scheduled.status !== "PENDING") return false;

    await tx.scheduledOrder.update({
      where: { id: scheduled.id },
      data: { status: "CANCELED", updatedAt: new Date(), nextRunAt: null },
    });
    await applyUserMoneyDelta(tx, scheduled.userId, { balance: Number(scheduled.charge) });
    return true;
  });

  if (!canceled) return { error: "Sipariş bulunamadı veya iptal edilemez." };

  revalidatePath("/dashboard/scheduled");
  revalidatePath("/admin/scheduled-orders");

  return { success: "Zamanlanmış sipariş iptal edildi." };
}

/* ─── Admin: Update refill request status ────────────────── */

export type UpdateRefillState = { success?: string; error?: string };

export async function adminUpdateRefillStatus(
  _prevState: UpdateRefillState,
  formData: FormData
): Promise<UpdateRefillState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Yetki yok." };
  }

  const refillId = String(formData.get("refillId") || "").trim();
  const status = String(formData.get("status") || "").trim() as
    | "PENDING"
    | "SENT"
    | "COMPLETED"
    | "REJECTED"
    | "FAILED";
  const adminNote = String(formData.get("adminNote") || "").trim() || null;

  const validStatuses = ["PENDING", "SENT", "COMPLETED", "REJECTED", "FAILED"];
  if (!refillId || !validStatuses.includes(status)) {
    return { error: "Geçersiz parametreler." };
  }

  await db.refillRequest.update({
    where: { id: refillId },
    data: {
      status,
      adminNote,
      resolvedAt: ["COMPLETED", "REJECTED", "FAILED"].includes(status)
        ? new Date()
        : null,
    },
  });

  revalidatePath("/admin/refills");
  return { success: "Durum güncellendi." };
}
