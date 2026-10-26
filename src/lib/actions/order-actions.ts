"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cancelProviderOrders, createProviderRefill } from "@/lib/api/provider-client";
import { calculateSafeServiceCharge } from "@/lib/pricing";
import { createUserNotification, notifyOrderCreated } from "@/lib/services/notifications";
import { sendOrderToProvider } from "@/lib/services/provider-order-sync";
import { claimOrderRefill, refillCooldownHoursLeft, releaseOrderRefillClaim } from "@/lib/services/refill-claim";
import { revalidatePath } from "next/cache";
import { applyUserMoneyDelta } from "@/lib/money";
import { getEffectiveAvailableBalance } from "@/lib/services/dashboard-checkout";
import { getVatRate } from "@/lib/settings";

export type CreateOrderState = {
  success?: string;
  error?: string;
  orderId?: string;
  isNewAccount?: boolean;
};

function buildGuestUsername(email: string) {
  const base = email
    .split("@")[0]
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 18) || "musteri";

  return `${base}${Math.floor(Date.now() / 1000).toString().slice(-6)}`;
}

export async function createOrder(
  _prevState: CreateOrderState,
  formData: FormData
): Promise<CreateOrderState> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session.user.role) {
    return { error: "Oturum bulunamadi." };
  }

  const serviceId = formData.get("serviceId") as string;
  const link = (formData.get("link") as string)?.trim();
  const quantity = Number(formData.get("quantity"));

  if (!serviceId || !link || !quantity) {
    return { error: "Tum alanlari doldurun." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, balance: true, spent: true, role: true, banned: true },
  });

  if (!user) {
    return { error: "Kullanici bulunamadi." };
  }
  if (user.banned) {
    return { error: "Hesabınız askıya alındı." };
  }

  let service:
    | {
        id: string;
        name: string;
        min: number;
        max: number;
        price: number;
        retailPrice: number | null;
        resellerPrice: number | null;
        serviceType: string | null;
        externalId: string | null;
        provider: {
          id: string;
          name: string;
          apiUrl: string;
          apiKey: string;
          status: boolean;
          retailMarkupPercent: number;
          resellerMarkupPercent: number;
        } | null;
      }
    | null = null;

  try {
    service = await db.service.findFirst({
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
        externalId: true,
        provider: {
          select: {
            id: true,
            name: true,
            apiUrl: true,
            apiKey: true,
            status: true,
            retailMarkupPercent: true,
            resellerMarkupPercent: true,
          },
        },
      },
    });
  } catch {
    const fallback = await db.service.findFirst({
      where: { id: serviceId, status: true },
      select: {
        id: true,
        name: true,
        min: true,
        max: true,
        price: true,
          serviceType: true,
        externalId: true,
        provider: {
          select: {
            id: true,
            name: true,
            apiUrl: true,
            apiKey: true,
            status: true,
              retailMarkupPercent: true,
              resellerMarkupPercent: true,
          },
        },
      },
    });

    service = fallback
      ? {
          ...fallback,
          retailPrice: null,
          resellerPrice: null,
        }
      : null;
  }

  if (!service) {
    return { error: "Servis bulunamadi veya pasif." };
  }

  if (quantity < service.min || quantity > service.max) {
    return { error: `Miktar ${service.min}-${service.max} araliginda olmalidir.` };
  }

  const charge = calculateSafeServiceCharge(user.role, service, quantity, undefined, await getVatRate()).charge;

  const availableBalance = await getEffectiveAvailableBalance(db, user.id, user.balance);
  if (availableBalance < charge) {
    return { error: "Yetersiz bakiye." };
  }

  const shouldForwardToProvider = Boolean(
    service.provider?.status && service.externalId && service.provider.apiUrl && service.provider.apiKey
  );

  let order;
  try {
    order = await db.$transaction(async (tx) => {
      const freshUserResult = await tx.$queryRaw<{balance: number}[]>`SELECT balance FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const freshUser = freshUserResult[0];

      if (!freshUser || (await getEffectiveAvailableBalance(tx, user.id, freshUser.balance)) < charge) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const created = await tx.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          link,
          quantity,
          charge,
          status: "PENDING",
          apiOrderId: null,
          remains: quantity,
          providerStatus: null,
          providerRawStatus: null,
          providerSentAt: null,
          providerSyncError: null,
          error: null,
        },
        select: { id: true, apiOrderId: true, status: true },
      });

      await applyUserMoneyDelta(tx, user.id, {
        balance: -charge,
        spent: charge,
      });

      return created;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return { error: "Yetersiz bakiye." };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/admin/orders");

  // Sipariş dönüşüm olayını kaydet
  try {
    const sessionId = String((formData as FormData & { get: (k: string) => unknown }).get("_sessionId") || "").trim().slice(0, 64) || null;
    const referrer = String((formData as FormData & { get: (k: string) => unknown }).get("_referrer") || "").trim().slice(0, 500) || null;
    const landingPage = String((formData as FormData & { get: (k: string) => unknown }).get("_landingPage") || "").trim().slice(0, 500) || null;
    await db.userEvent.create({
      data: {
        type: "order",
        userId: user.id,
        sessionId,
        referrer,
        landingPage,
        meta: { orderId: order.id, amount: charge, serviceName: service.name },
      },
    });
  } catch { /* analytics hatası sipariş akışını bozmasın */ }

  const sendResult = shouldForwardToProvider
    ? await sendOrderToProvider(order.id)
    : null;

  if (sendResult?.sent) {
    await notifyOrderCreated({
      userId: user.id,
      orderId: order.id,
      serviceName: service.name,
      amount: charge,
    });

    return {
      success: `Sipariş alındı ve işleme başlandı (#${order.id}).`,
    };
  }

  if (sendResult?.resolved && sendResult.status === "CANCELED") {
    return {
      success: `Sipariş sağlayıcı tarafından reddedildi ve ${charge.toFixed(2)} TL bakiyenize iade edildi (#${order.id}).`,
      orderId: order.id,
    };
  }

  if (shouldForwardToProvider && sendResult && !sendResult.sent) {
    await notifyOrderCreated({
      userId: user.id,
      orderId: order.id,
      serviceName: service.name,
      amount: charge,
    });

    return {
      success: `Sipariş kaydedildi (#${order.id}). Kısa süre içinde işleme alınacaktır.`,
    };
  }

  await notifyOrderCreated({
    userId: user.id,
    orderId: order.id,
    serviceName: service.name,
    amount: charge,
  });

  return { success: `Siparis alindi (#${order.id}).` };
}

export async function createPublicRetailOrder(
  _prevState: CreateOrderState,
  formData: FormData
): Promise<CreateOrderState> {
  const packageId = String(formData.get("packageId") || "");
  const customerName = String(formData.get("customerName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const link = String(formData.get("link") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;

  if (!packageId || !customerName || !email || !link) {
    return { error: "Ad soyad, e-posta, link ve paket secimi zorunludur." };
  }

  const packageRow = await (db as unknown as {
    package?: {
      findFirst: (args: Record<string, unknown>) => Promise<{
        id: string;
        name: string;
        quantity: number;
        price: number;
        retailPrice: number | null;
        service: { id: string; min: number; max: number; name: string };
      } | null>;
    };
  }).package?.findFirst({
    where: { id: packageId, status: true },
    select: {
      id: true,
      name: true,
      quantity: true,
      price: true,
      retailPrice: true,
      service: {
        select: { id: true, min: true, max: true, name: true },
      },
    },
  });

  if (!packageRow) {
    return { error: "Paket bulunamadi veya pasif." };
  }

  if (packageRow.quantity < packageRow.service.min || packageRow.quantity > packageRow.service.max) {
    return { error: "Paket miktari bagli servisin limitleri ile uyumlu degil." };
  }

  const packagePrice = Number((packageRow.retailPrice ?? packageRow.price).toFixed(4));
  const charge = Number((packagePrice * (1 + (await getVatRate()) / 100)).toFixed(4));

  const result = await db.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true },
    });

    let isNewAccount = false;
    let userId: string;

    if (!existingUser) {
      const newUser = await tx.user.create({
        data: {
          name: customerName,
          email,
          username: buildGuestUsername(email),
          role: "USER",
          phone,
          // Şifre belirlenmez; kullanıcı sonradan "şifremi unuttum" ile hesabını aktive edebilir
        },
        select: { id: true },
      });
      userId = newUser.id;
      isNewAccount = true;
    } else {
      userId = existingUser.id;
      if (phone) {
        await tx.user.update({
          where: { id: userId },
          data: { phone },
        });
      }
    }

    const order = await tx.order.create({
      data: {
        userId,
        serviceId: packageRow.service.id,
        link,
        quantity: packageRow.quantity,
        charge,
        status: "PENDING",
        remains: packageRow.quantity,
        error: "awaiting_payment",
      },
      select: { id: true },
    });

    await tx.payment.create({
      data: {
        userId,
        amount: charge,
        method: "RETAIL_FRONTEND",
        status: "PENDING",
        externalId: `RTL-${Date.now()}`,
      },
    });

    return { orderId: order.id, isNewAccount };
  });

  revalidatePath("/services");
  revalidatePath("/admin/orders");
  revalidatePath("/dashboard/orders");

  return {
    success: `Siparisiniz alindi (#${result.orderId}).`,
    orderId: result.orderId,
    isNewAccount: result.isNewAccount,
  };
}

// ─── Mass Order ───────────────────────────────────────────────────────────────

export type MassOrderResult = {
  ok: boolean;
  url: string;
  orderId?: string;
  error?: string;
};

export type MassOrderState = {
  results?: MassOrderResult[];
  error?: string;
};

export async function createMassOrder(
  _prevState: MassOrderState,
  formData: FormData
): Promise<MassOrderState> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session.user.role) {
    return { error: "Oturum bulunamadi." };
  }

  const serviceId = formData.get("serviceId") as string;
  const rawLinks = (formData.get("links") as string) ?? "";
  const quantity = Number(formData.get("quantity"));

  if (!serviceId || !rawLinks.trim() || !quantity) {
    return { error: "Tum alanlari doldurun." };
  }

  const links = rawLinks
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (links.length === 0) {
    return { error: "En az 1 link girmelisiniz." };
  }

  if (links.length > 500) {
    return { error: "Tek seferde en fazla 500 sipariş verilebilir." };
  }

  const service = await db.service.findFirst({
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
      externalId: true,
      provider: {
        select: { id: true, name: true, apiUrl: true, apiKey: true, status: true, retailMarkupPercent: true, resellerMarkupPercent: true },
      },
    },
  });

  if (!service) {
    return { error: "Servis bulunamadi." };
  }

  if (quantity < service.min || quantity > service.max) {
    return {
      error: `Miktar ${service.min.toLocaleString()}-${service.max.toLocaleString()} arasında olmalı.`,
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, balance: true, spent: true, role: true },
  });

  if (!user) return { error: "Kullanici bulunamadi." };

  const chargePerOrder = calculateSafeServiceCharge(session.user.role, service, quantity, undefined, await getVatRate()).charge;
  const totalCharge = chargePerOrder * links.length;

  const massAvailable = await getEffectiveAvailableBalance(db, userId, Number(user.balance));
  if (massAvailable < totalCharge) {
    return {
      error: `Yetersiz bakiye. Toplam maliyet: ${totalCharge.toFixed(2)} TRY, kullanılabilir bakiye: ${massAvailable.toFixed(2)} TRY.`,
    };
  }

  const results: MassOrderResult[] = [];

  for (const url of links) {
    try {
      const order = await db.$transaction(async (tx) => {
        const freshUserResult = await tx.$queryRaw<{balance: number}[]>`SELECT balance FROM "User" WHERE id = ${userId} FOR UPDATE`;
        const freshUser = freshUserResult[0];

        if (!freshUser || (await getEffectiveAvailableBalance(tx, userId, freshUser.balance)) < chargePerOrder) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const o = await tx.order.create({
          data: {
            userId,
            serviceId: service.id,
            link: url,
            quantity,
            charge: chargePerOrder,
            status: "PENDING",
            apiOrderId: null,
            remains: quantity,
            providerStatus: null,
            providerRawStatus: null,
            providerSentAt: null,
          },
          select: { id: true },
        });

        await applyUserMoneyDelta(tx, userId, {
          balance: -chargePerOrder,
          spent: chargePerOrder,
        });

        return o;
      });

      const sendResult = service.provider?.status && service.externalId
        ? await sendOrderToProvider(order.id)
        : null;

      if (sendResult?.resolved && sendResult.status === "CANCELED") {
        results.push({ ok: false, url, orderId: order.id, error: "Sağlayıcı siparişi reddetti; ücret otomatik iade edildi." });
        continue;
      }

      results.push({ ok: true, url, orderId: order.id });
    } catch (error) {
      results.push({
        ok: false,
        url,
        error: error instanceof Error && error.message === "INSUFFICIENT_BALANCE" ? "Yetersiz bakiye" : (error instanceof Error ? error.message : "Bilinmeyen hata"),
      });
    }
  }

  revalidatePath("/dashboard/orders");

  return { results };
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────

export type CancelOrderState = {
  success?: string;
  error?: string;
  refundedAmount?: number;
  cancelPending?: boolean;  // true = cancel sent to provider, awaiting confirmation
};

export async function cancelOrder(
  _prevState: CancelOrderState,
  formData: FormData
): Promise<CancelOrderState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return { error: "Sipariş ID gerekli." };

  // Siparişi ve servis iptal bilgisini çek
  const order = await db.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: {
      id: true,
      status: true,
      charge: true,
      quantity: true,
      remains: true,
      startCount: true,
      cancelledAt: true,
      apiOrderId: true,
      service: {
        select: {
          canCancel: true,
          provider: { select: { id: true, apiUrl: true, apiKey: true } },
        },
      },
    },
  });

  if (!order) return { error: "Sipariş bulunamadı." };
  if (order.cancelledAt) return { error: "Bu sipariş zaten iptal edildi." };

  const cancellableStatuses = ["PENDING", "PROCESSING"];
  if (!cancellableStatuses.includes(order.status)) {
    return { error: "Tamamlanmış veya kısmi teslim edilmiş siparişler iptal edilemez." };
  }

  if (!order.service.canCancel) {
    return { error: "Bu servis iptal özelliğini desteklemiyor." };
  }

  const provider = order.service.provider;

  // ── Sağlayıcıya gönderilmiş sipariş ──
  if (provider && order.apiOrderId) {
    const cancelResult = await cancelProviderOrders(
      provider.apiUrl,
      provider.apiKey,
      [order.apiOrderId]
    );

    // Sağlayıcı API'si iptal isteğini kabul etmedi ya da hata döndü → işlemi reddet
    if (!cancelResult.ok || cancelResult.failed.length > 0) {
      const failReason = cancelResult.failed[0]?.error ?? "Sağlayıcı isteği reddetti.";
      return { error: `İptal işlemi şu an tamamlanamadı: ${failReason}` };
    }

    // İptal isteği gönderildi — iade sağlayıcı onayından SONRA otomatik işlenecek
    // Scheduler syncOrderWithProvider() aracılığıyla provider durumu "Canceled" olduğunda iade eder
    await db.order.update({
      where: { id: order.id },
      data: {
        providerStatus: "CANCEL_REQUESTED",
        cancelledAt: new Date(),
        error: "cancel_requested",
      },
    });

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");

    await createUserNotification({
      userId: session.user.id,
      type: "ORDER_UPDATE",
      title: "İptal talebi alındı",
      message: "Sipariş iptal talebiniz alındı. Onay sonrası iade otomatik yapılacaktır.",
      link: "/dashboard/orders",
    });

    return {
      success: "İptal isteğiniz alındı.",
      cancelPending: true,
    };
  }

  // ── Henüz sağlayıcıya gönderilmemiş sipariş — atomik kontrol + anında iptal + tam iade ──
  const refundedAmount = Number((order.charge * 1).toFixed(4));

  try {
    await db.$transaction(async (tx) => {
      const canceled = await tx.order.updateMany({
        where: {
          id: order.id,
          userId: session.user.id,
          apiOrderId: null,
          cancelledAt: null,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        data: {
          status: "CANCELED",
          cancelledAt: new Date(),
          refundedAmount,
        },
      });

      if (canceled.count !== 1) {
        const freshOrder = await tx.order.findUnique({
          where: { id: order.id },
          select: { apiOrderId: true },
        });
        throw new Error(freshOrder?.apiOrderId ? "ORDER_SENT_TO_PROVIDER" : "ALREADY_CANCELED");
      }

      if (refundedAmount > 0) {
        await applyUserMoneyDelta(tx, session.user.id, {
          balance: refundedAmount,
          spent: -refundedAmount,
        });
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "ORDER_SENT_TO_PROVIDER") {
      return { error: "Sipariş sağlayıcıya iletildi. İptal için sağlayıcı onayı bekleniyor." };
    }
    if (msg === "ALREADY_CANCELED") {
      return { error: "Bu sipariş zaten iptal edildi." };
    }
    throw err;
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");

  await createUserNotification({
    userId: session.user.id,
    type: "ORDER_UPDATE",
    title: "Sipariş iptal edildi",
    message: refundedAmount > 0
      ? `Sipariş iptal edildi. ${refundedAmount.toFixed(2)} TL iade bakiyenize eklendi.`
      : "Sipariş iptal edildi.",
    link: "/dashboard/orders",
  });

  return {
    success: `Sipariş iptal edildi.`,
    refundedAmount,
  };
}

// ─── Request Refill ───────────────────────────────────────────────────────────

export type RefillOrderState = {
  success?: string;
  error?: string;
};

export async function requestRefill(
  _prevState: RefillOrderState,
  formData: FormData
): Promise<RefillOrderState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return { error: "Sipariş ID gerekli." };

  const order = await db.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: {
      id: true,
      status: true,
      apiOrderId: true,
      lastRefillAt: true,
      service: {
        select: {
          canRefill: true,
          provider: { select: { apiUrl: true, apiKey: true } },
        },
      },
    },
  });

  if (!order) return { error: "Sipariş bulunamadı." };
  if (!order.service.canRefill) return { error: "Bu servis telafi özelliğini desteklemiyor." };
  if (!["COMPLETED", "PARTIAL"].includes(order.status)) {
    return { error: "Telafi sadece tamamlanmış siparişlere uygulanabilir." };
  }

  // 24 saat cooldown kontrolü
  const hoursLeft = refillCooldownHoursLeft(order.lastRefillAt);
  if (hoursLeft > 0) return { error: `Tekrar telafi için ${hoursLeft} saat beklemeniz gerekiyor.` };

  if (!order.apiOrderId || !order.service.provider) {
    return { error: "Bu sipariş için sağlayıcı bilgisi bulunamadı." };
  }

  const now = new Date();
  if (!(await claimOrderRefill(order.id, session.user.id, now))) {
    return { error: "Bu sipariş için yakın zamanda bir telafi isteği gönderildi." };
  }

  let res;
  try {
    res = await createProviderRefill(
      order.service.provider.apiUrl,
      order.service.provider.apiKey,
      order.apiOrderId
    );
  } catch (error) {
    await releaseOrderRefillClaim(order.id, session.user.id, now, order.lastRefillAt);
    throw error;
  }

  if (!res.ok) {
    await releaseOrderRefillClaim(order.id, session.user.id, now, order.lastRefillAt);
    return { error: res.error || "Telafi isteği başlatılamadı. Lütfen daha sonra tekrar deneyin." };
  }

  await db.refillRequest.create({
      data: {
        orderId: order.id,
        userId: session.user.id,
        status: "SENT",
        providerRefillId: res.refillId ?? null,
        resolvedAt: null,
      },
    });

  revalidatePath("/dashboard/orders");
  revalidatePath("/admin/refills");

  await createUserNotification({
    userId: session.user.id,
    type: "ORDER_UPDATE",
    title: "Telafi başlatıldı",
    message: "Sipariş telafi isteğiniz sağlayıcıya iletildi. Kısa süre içinde tamamlanacaktır.",
    link: "/dashboard/orders",
  });

  return { success: "Telafi isteği başarıyla gönderildi." };
}
