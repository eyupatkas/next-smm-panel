import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { addProviderOrder, cancelProviderOrders, getProviderOrderStatus, getProviderOrdersStatusBatch, ProviderOrderStatusResult } from "@/lib/api/provider-client";
import { createJobRunSafe } from "@/lib/job-runs";
import { createUserNotification, notifyOrderStatus } from "@/lib/services/notifications";
import { calculateSafeServiceCharge } from "@/lib/pricing";
import { cleanOrderLink } from "@/lib/services/order-link";
import { classifyProviderFailure, type ProviderFailureInfo } from "@/lib/services/provider-error";
import { getSettings } from "@/lib/settings";
import {
  DEFAULT_CANCEL_CONFIRM_HOURS,
  DEFAULT_STUCK_THRESHOLD_HOURS,
  STUCK_ESCALATION_BATCH,
  computeOrderCancelRefund,
  parsePositiveHours,
} from "@/lib/services/stuck-orders";
import { applyUserMoneyDelta } from "@/lib/money";

const PROVIDER_STATUS_REFRESH_MS = 45_000;

type SyncOrderResult = {
  orderId: string;
  providerName?: string;
  sent: boolean;
  synced: boolean;
  refundedAmount: number;
  status?: OrderStatus;
  error?: string;
};

type SendOrderToProviderResult = {
  orderId: string;
  providerName?: string;
  sent: boolean;
  apiOrderId?: string;
  error?: string;
  status?: OrderStatus;
  refundedAmount?: number;
  resolved?: boolean;
};

function calculatePartialRefund(charge: number, quantity: number, remains: number) {
  if (quantity <= 0 || remains <= 0 || charge <= 0) return 0;
  // GÜVENLİK: Bazı sağlayıcılar (özellikle paket servisler) `remains` değerini
  // yerel `quantity`'den farklı bir birimde döndürebilir (örn. quantity=1, remains=200).
  // `remains`'i `quantity`'ye sınırlamazsak iade orijinal tutarın katları kadar şişer.
  // Ayrıca iade hiçbir koşulda alınan ücreti (charge) aşamaz.
  const clampedRemains = Math.min(Math.max(remains, 0), quantity);
  const refund = (charge * clampedRemains) / quantity;
  return Number(Math.min(refund, charge).toFixed(4));
}

async function applyRefundIfNeeded(input: {
  orderId: string;
  userId: string;
  previousStatus: OrderStatus;
  nextStatus: OrderStatus;
  currentCharge: number;
  quantity: number;
  remains: number;
  startCount: number;
  error: string | null;
  providerStatus?: string | null;
  providerRawStatus?: string | null;
  providerSyncError?: string | null;
  providerLastCheckedAt?: Date;
}) {
  const terminalAlreadyHandled = ["CANCELED", "PARTIAL", "REFUNDED"].includes(input.previousStatus);

  if (terminalAlreadyHandled) {
    // Statü sıralaması: otomatik senkron daha "iyi" bir terminal durumun üzerine yazamaz.
    // Örn: PARTIAL → CANCELED geçişine izin verme (sağlayıcı sonradan iptal rapor etse bile).
    const statusRank: Record<string, number> = { COMPLETED: 4, PARTIAL: 3, REFUNDED: 3, CANCELED: 2, PROCESSING: 1, PENDING: 0 };
    const prevRank = statusRank[input.previousStatus] ?? 0;
    const nextRank = statusRank[input.nextStatus] ?? 0;
    // Sadece daha iyi (veya eşit) bir duruma geçişe izin ver
    const resolvedStatus = nextRank >= prevRank ? input.nextStatus : input.previousStatus;

    await db.order.update({
      where: { id: input.orderId },
      data: {
        status: resolvedStatus,
        remains: input.remains,
        startCount: input.startCount,
        error: input.error,
        providerStatus: input.providerStatus,
        providerRawStatus: input.providerRawStatus,
        providerSyncError: input.providerSyncError,
        providerLastCheckedAt: input.providerLastCheckedAt,
        stuckAt: null,
        stuckReason: null,
      },
    });
    return 0;
  }

  let refundAmount = 0;
  let nextCharge = input.currentCharge;

  if (input.nextStatus === "CANCELED") {
    // Teslim edilen miktara göre orantılı iade hesapla (paylaşılan yardımcı).
    refundAmount = computeOrderCancelRefund({
      charge: input.currentCharge,
      quantity: input.quantity,
      remains: input.remains,
      startCount: input.startCount,
    });
    nextCharge = Number(Math.max(input.currentCharge - refundAmount, 0).toFixed(4));
  }

  if (input.nextStatus === "PARTIAL") {
    refundAmount = calculatePartialRefund(input.currentCharge, input.quantity, input.remains);
    nextCharge = Number(Math.max(input.currentCharge - refundAmount, 0).toFixed(4));
  }

  // Atomik geçiş: yalnızca terminal-olmayan durumdan geçiş olduğunda iade uygula.
  // Bu şekilde eşzamanlı iki sync çağrısının ikisi de iade uygulaması (double-refund) önlenir.
  // updateMany'nin WHERE koşulu PostgreSQL'de satır kilidi alır; yalnızca ilk kazanan işlem günceller.
  let appliedRefund = 0;
  await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: input.orderId,
        // Yalnızca terminal-olmayan durumdan geçiş — eğer başka bir işlem daha önce
        // terminal duruma çektiyse bu sorgu 0 satır günceller ve iade uygulanmaz.
        status: { notIn: ["CANCELED", "PARTIAL", "REFUNDED"] },
      },
      data: {
        status: input.nextStatus,
        remains: input.remains,
        startCount: input.startCount,
        charge: nextCharge,
        refundedAmount: refundAmount > 0 ? refundAmount : undefined,
        cancelledAt: input.nextStatus === "CANCELED" ? new Date() : undefined,
        error: input.error,
        providerStatus: input.providerStatus,
        providerRawStatus: input.providerRawStatus,
        providerSyncError: input.providerSyncError,
        providerLastCheckedAt: input.providerLastCheckedAt,
        stuckAt: null,
        stuckReason: null,
      },
    });

    if (updated.count > 0 && refundAmount > 0) {
      // Geçiş gerçekleşti — iade uygula
      await applyUserMoneyDelta(tx, input.userId, {
        balance: refundAmount,
        spent: -refundAmount,
      });
      appliedRefund = refundAmount;
    } else if (updated.count === 0) {
      // Sipariş zaten terminal durumda — sadece provider takip alanlarını güncelle
      await tx.order.update({
        where: { id: input.orderId },
        data: {
          error: input.error,
          providerStatus: input.providerStatus,
          providerRawStatus: input.providerRawStatus,
          providerSyncError: input.providerSyncError,
          providerLastCheckedAt: input.providerLastCheckedAt,
        },
      });
    }
  });

  return appliedRefund;
}

export async function syncOrderWithProvider(
  orderId: string,
  preloadedStatus?: ProviderOrderStatusResult,
  options?: { allowAmbiguousRetry?: boolean },
): Promise<SyncOrderResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      link: true,
      quantity: true,
      charge: true,
      status: true,
      apiOrderId: true,
      providerStatus: true,
      error: true,
      customComments: true,
      cancelledAt: true,
      startCount: true,
      remains: true,
      serviceId: true,
      createdAt: true,
      service: {
        select: {
          name: true,
          externalId: true,
          provider: {
            select: {
              name: true,
              apiUrl: true,
              apiKey: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!order?.service.provider?.status || !order.service.externalId) {
    if (order?.customComments) {
      await db.order.update({
        where: { id: order.id },
        data: {
          awaitingManualComments: true,
          providerSyncError: "Saglayici baglantisi bulunamadi",
        },
      });
    }

    return {
      orderId,
      sent: false,
      synced: false,
      refundedAmount: 0,
      error: "Saglayici baglantisi bulunamadi",
    };
  }

  // Ödeme henüz onaylanmamış siparişleri kesinlikle sağlayıcıya gönderme
  if (order.error === "awaiting_payment") {
    return {
      orderId: order.id,
      sent: false,
      synced: false,
      refundedAmount: 0,
      error: "awaiting_payment",
    };
  }

  // Sipariş iptal talep edilmişse sağlayıcıya yeni gönderim yapma
  const isCancelRequested =
    order.error === "cancel_requested" || order.providerStatus === "CANCEL_REQUESTED";

  let apiOrderId = order.apiOrderId;
  let sent = false;

  if (!apiOrderId && !isCancelRequested) {
    const sendResult = await sendOrderToProvider(order.id, options);
    sent = sendResult.sent;

    if (!sendResult.sent || !sendResult.apiOrderId) {
      return {
        orderId: order.id,
        providerName: order.service.provider.name,
        sent,
        synced: Boolean(sendResult.resolved),
        refundedAmount: sendResult.refundedAmount ?? 0,
        status: sendResult.status ?? (sent ? "PROCESSING" : "PENDING"),
        error: sendResult.resolved ? undefined : (sendResult.error || "Saglayici siparisi kabul etmedi"),
      };
    }

    apiOrderId = sendResult.apiOrderId;
  }

  // apiOrderId kesinlikle dolu olmalı — yoksa sonucu raporla
  if (!apiOrderId) {
    return {
      orderId: order.id,
      providerName: order.service.provider.name,
      sent,
      synced: false,
      refundedAmount: 0,
      error: "apiOrderId bulunamadı",
    };
  }

  const statusResult = preloadedStatus ?? await getProviderOrderStatus({
    apiUrl: order.service.provider.apiUrl,
    apiKey: order.service.provider.apiKey,
    apiOrderId,
  });

  if (!statusResult.ok || !statusResult.status) {
    const rawStatus = statusResult.rawStatus || "unknown";
    await db.order.update({
      where: { id: order.id },
      data: {
        error: statusResult.raw,
        providerRawStatus: rawStatus,
        providerSyncError: statusResult.error || `Unmapped provider status: ${rawStatus}`,
        providerLastCheckedAt: new Date(),
      },
    });

    return {
      orderId: order.id,
      providerName: order.service.provider.name,
      sent,
      synced: false,
      refundedAmount: 0,
      error: statusResult.error || "Saglayici durum bilgisi alinamadi",
    };
  }

  const remains = Math.max(statusResult.remains || 0, 0);
  const startCount = Math.max(statusResult.startCount || 0, 0);

  let refundedAmount = 0;

  if (statusResult.status === "CANCELED" || statusResult.status === "PARTIAL") {
    refundedAmount = await applyRefundIfNeeded({
      orderId: order.id,
      userId: order.userId,
      previousStatus: order.status,
      nextStatus: statusResult.status,
      currentCharge: order.charge,
      quantity: order.quantity,
      remains,
      startCount,
      error: null,
      providerStatus: statusResult.status,
      providerRawStatus: statusResult.rawStatus || statusResult.status,
      providerSyncError: null,
      providerLastCheckedAt: new Date(),
    });

    await notifyOrderStatus({
      userId: order.userId,
      orderId: order.id,
      serviceName: order.service.name,
      status: statusResult.status,
      refundedAmount,
    });
  } else if (isCancelRequested) {
    // İptal talebi bekliyor ama sağlayıcı henüz onaylamadı — CANCEL_REQUESTED durumunu koru
    // Sadece son kontrol zamanını güncelle, iptal talebini silme
    await db.order.update({
      where: { id: order.id },
      data: {
        providerRawStatus: statusResult.rawStatus || statusResult.status,
        providerLastCheckedAt: new Date(),
        // Başarılı durum sorgusu önceki geçici ağ hatasını temizler. Kullanıcının
        // iptal talebi `error` ve `providerStatus` alanlarında korunur.
        providerSyncError: null,
        // providerStatus, error, status DEĞİŞTİRME — iptal onayı bekleniyor
      },
    });
  } else {
    const previousStatus = order.status;

    await db.order.update({
      where: { id: order.id },
      data: {
        status: statusResult.status,
        remains,
        startCount,
        providerStatus: statusResult.status,
        providerRawStatus: statusResult.rawStatus || statusResult.status,
        providerLastCheckedAt: new Date(),
        providerSyncError: null,
        awaitingManualComments: false,
        error: null,
        // Sağlayıcı siparişi tamamladıysa askıda bayrağı kaldırılır
        ...(statusResult.status === "COMPLETED" ? { stuckAt: null, stuckReason: null } : {}),
      },
    });

    // Yeni tamamlanma: ortalama süreyi güncelle (rolling average)
    if (previousStatus !== statusResult.status && statusResult.status === "COMPLETED") {
      const completionMinutes = (Date.now() - order.createdAt.getTime()) / 60_000;
      // Makul aralık: 0 < süre < 7 gün — aşırı değerleri hariç tut
      if (completionMinutes > 0 && completionMinutes < 10_080) {
        const svc = await db.service.findUnique({
          where: { id: order.serviceId },
          select: { avgCompletionMinutes: true, completedOrderCount: true },
        });
        if (svc) {
          const oldCount = svc.completedOrderCount;
          const oldAvg = svc.avgCompletionMinutes ?? completionMinutes;
          const newCount = oldCount + 1;
          const newAvg = (oldAvg * oldCount + completionMinutes) / newCount;
          await db.service.update({
            where: { id: order.serviceId },
            data: { avgCompletionMinutes: newAvg, completedOrderCount: newCount },
          });
        }
      }
    }

    if (previousStatus !== statusResult.status && (statusResult.status === "PROCESSING" || statusResult.status === "COMPLETED")) {
      await notifyOrderStatus({
        userId: order.userId,
        orderId: order.id,
        serviceName: order.service.name,
        status: statusResult.status,
      });
    }
  }

  return {
    orderId: order.id,
    providerName: order.service.provider.name,
    sent,
    synced: true,
    refundedAmount,
    status: statusResult.status,
  };
}

// providerSentAt'ı gönderim sırasında "kilit" olarak kullanmak için: eğer >10 dakika geçmişse
// apiOrderId hâlâ yoksa bir önceki claim'in başarısız olduğu anlaşılır; yeniden denemeye izin ver.
const SEND_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

async function settleRejectedOrder(input: {
  order: {
    id: string;
    userId: string;
    serviceId: string;
    charge: number;
    quantity: number;
  };
  failure: ProviderFailureInfo;
  technicalError: string;
}) {
  let applied = false;
  let refundedAmount = 0;

  await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: input.order.id,
        apiOrderId: null,
        status: { notIn: ["CANCELED", "PARTIAL", "REFUNDED", "COMPLETED"] },
      },
      data: {
        status: "CANCELED",
        error: input.failure.message,
        providerSyncError: input.technicalError,
        providerStatus: "REJECTED",
        providerRawStatus: input.failure.code,
        providerSentAt: null,
        providerLastCheckedAt: new Date(),
        awaitingManualComments: false,
        remains: input.order.quantity,
        refundedAmount: input.order.charge,
        cancelledAt: new Date(),
      },
    });

    if (updated.count === 0) return;

    applied = true;
    refundedAmount = input.order.charge;

    if (input.order.charge > 0) {
      await applyUserMoneyDelta(tx, input.order.userId, {
        balance: input.order.charge,
        spent: -input.order.charge,
      });
    }

    if (input.failure.suggestedLinkFormat) {
      await tx.service.update({
        where: { id: input.order.serviceId },
        data: { linkFormat: input.failure.suggestedLinkFormat },
      });
    }
  });

  return { applied, refundedAmount };
}

export async function sendOrderToProvider(
  orderId: string,
  options?: { allowAmbiguousRetry?: boolean },
): Promise<SendOrderToProviderResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      link: true,
      quantity: true,
      charge: true,
      apiOrderId: true,
      providerSentAt: true,
      providerSyncError: true,
      customComments: true,
      userId: true,
      serviceId: true,
      user: { select: { role: true, id: true } },
      service: {
        select: {
          name: true,
          externalId: true,
          price: true,
          retailPrice: true,
          resellerPrice: true,
          min: true,
          max: true,
          serviceType: true,
          provider: {
            select: {
              name: true,
              apiUrl: true,
              apiKey: true,
              status: true,
              retailMarkupPercent: true,
              resellerMarkupPercent: true,
            },
          },
        },
      },
    },
  });

  if (!order?.service.provider?.status || !order.service.externalId) {
    return {
      orderId,
      sent: false,
      error: "Saglayici baglantisi bulunamadi",
    };
  }

  // Zaten sağlayıcıya gönderilmiş — idempotent dönüş
  if (order.apiOrderId) {
    return {
      orderId: order.id,
      providerName: order.service.provider.name,
      sent: true,
      apiOrderId: order.apiOrderId,
    };
  }

  if (order.providerSyncError) {
    const previousFailure = classifyProviderFailure(order.providerSyncError);

    if (previousFailure.resolution === "CANCEL_AND_REFUND") {
      const settled = await settleRejectedOrder({
        order,
        failure: previousFailure,
        technicalError: order.providerSyncError,
      });

      if (settled.applied) {
        await notifyOrderStatus({
          userId: order.userId,
          orderId: order.id,
          serviceName: order.service.name,
          status: "CANCELED",
          refundedAmount: settled.refundedAmount,
        });
      }

      return {
        orderId: order.id,
        providerName: order.service.provider.name,
        sent: false,
        status: "CANCELED",
        refundedAmount: settled.refundedAmount,
        resolved: true,
      };
    }

    if (previousFailure.resolution === "MANUAL_REVIEW" && !options?.allowAmbiguousRetry) {
      return {
        orderId: order.id,
        providerName: order.service.provider.name,
        sent: false,
        status: "PENDING",
        error: previousFailure.message,
      };
    }
  }

  const safeResult = calculateSafeServiceCharge(order.user.role, order.service, order.quantity);
  // Güvenlik kontrolü: tahsilat, SAĞLAYICI MALİYETİNİN altındaysa gönderme.
  // Kullanıcıya uygulanan fiyat (safeResult.charge) değil providerCost kullanılır;
  // çünkü fiyat güncellemesi / markup değişimi eskiden alınan siparişleri bloke etmemeli.
  if (order.charge > 0 && order.charge + 0.0001 < safeResult.providerCost) {
    const message = `Guvenlik nedeniyle saglayiciya gonderilmedi: tahsilat ${order.charge.toFixed(4)} TL, saglayici maliyeti ${safeResult.providerCost.toFixed(4)} TL`;
    await db.order.update({
      where: { id: order.id },
      data: {
        providerSyncError: message,
        providerLastCheckedAt: new Date(),
        error: null,
      },
    });

    return {
      orderId: order.id,
      providerName: order.service.provider.name,
      sent: false,
      error: message,
    };
  }

  // ── Atomik ön-kilit: API çağrısından ÖNCE providerSentAt'ı bu process için ayır ──
  // Bu, birden fazla eş zamanlı sürecin (scheduler + cron + order-tracking + admin sync)
  // aynı siparişi aynı anda sağlayıcıya göndermesini engeller.
  //
  // Kilit koşulu: providerSentAt IS NULL veya SEND_CLAIM_TIMEOUT_MS'den eski
  // (önceki gönderim başarısız olduysa ve apiOrderId hâlâ yoksa yeniden dene)
  const claimCutoff = new Date(Date.now() - SEND_CLAIM_TIMEOUT_MS);
  const claimed = await db.order.updateMany({
    where: {
      id: order.id,
      status: "PENDING",
      apiOrderId: null,
      cancelledAt: null,
      // NULL semantics düzeltmesi: PostgreSQL'de `!= 'x'` NULL satırları HARIÇ tutar.
      // cancel_requested ve awaiting_payment olmayan veya error alanı NULL olan satırları hedefle.
      OR: [
        { error: null },
        { error: { notIn: ["cancel_requested", "awaiting_payment"] } },
      ],
      AND: [
        {
          OR: [
            { providerSentAt: null },
            { providerSentAt: { lte: claimCutoff } },
          ],
        },
      ],
    },
    data: { providerSentAt: new Date() },
  });

  if (claimed.count === 0) {
    // Başka bir process bu siparişi zaten işliyor (veya apiOrderId set edildi) — atla
    const fresh = await db.order.findUnique({ where: { id: order.id }, select: { apiOrderId: true } });
    if (fresh?.apiOrderId) {
      return {
        orderId: order.id,
        providerName: order.service.provider.name,
        sent: true,
        apiOrderId: fresh.apiOrderId,
      };
    }
    return {
      orderId: order.id,
      providerName: order.service.provider.name,
      sent: false,
      error: "Order is already being processed by another instance",
    };
  }

  // ── Kilit alındı — sağlayıcıya gönder ──
  const addResult = await addProviderOrder({
    apiUrl: order.service.provider.apiUrl,
    apiKey: order.service.provider.apiKey,
    externalServiceId: order.service.externalId,
    link: cleanOrderLink(order.link),
    quantity: order.quantity,
    comments: order.customComments ?? undefined,
  });

  if (addResult.ok && addResult.apiOrderId) {
    // NULL semantics düzeltmesi: `error: { not: "cancel_requested" }` PostgreSQL'de
    // error IS NULL olan satırları HARIÇ tutar — OR ile açıkça dahil et.
    const updated = await db.order.updateMany({
      where: {
        id: order.id,
        status: "PENDING",
        cancelledAt: null,
        OR: [
          { error: null },
          { error: { not: "cancel_requested" } },
        ],
      },
      data: {
        apiOrderId: addResult.apiOrderId,
        status: "PROCESSING",
        remains: order.quantity,
        providerStatus: "PROCESSING",
        providerRawStatus: "accepted",
        providerSentAt: new Date(),
        providerLastCheckedAt: null,
        providerSyncError: null,
        awaitingManualComments: false,
        error: null,
      },
    });

    if (updated.count === 0) {
      // Sipariş, API çağrısı yapılırken iptal edilmiş — sağlayıcıdaki kopyayı iptal et
      console.warn(
        `[sendOrderToProvider] Order ${order.id} was cancelled during provider API call; cancelling provider order ${addResult.apiOrderId}`
      );
      await cancelProviderOrders(
        order.service.provider.apiUrl,
        order.service.provider.apiKey,
        [addResult.apiOrderId]
      ).catch((err) => {
        console.error(
          `[sendOrderToProvider] Failed to cancel duplicate provider order ${addResult.apiOrderId} for local order ${order.id}:`,
          err
        );
      });
      return {
        orderId: order.id,
        providerName: order.service.provider.name,
        sent: false,
        error: "Order was cancelled before provider confirmation; cancel sent to provider",
      };
    }
  } else {
    const technicalError = addResult.error || addResult.raw || "Bilinmeyen sağlayıcı hatası";
    const failure = classifyProviderFailure(addResult.error, addResult.raw);

    if (failure.resolution === "CANCEL_AND_REFUND") {
      const settled = await settleRejectedOrder({ order, failure, technicalError });

      if (settled.applied) {
        await notifyOrderStatus({
          userId: order.userId,
          orderId: order.id,
          serviceName: order.service.name,
          status: "CANCELED",
          refundedAmount: settled.refundedAmount,
        });
      }

      return {
        orderId: order.id,
        providerName: order.service.provider.name,
        sent: false,
        status: "CANCELED",
        refundedAmount: settled.refundedAmount,
        resolved: true,
      };
    }

    // Ağ hatası sonrası sağlayıcı siparişi kabul etmiş olabilir. Ham hata yalnızca
    // admin alanında tutulur; müşteri alanına teknik yanıt sızdırılmaz.
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "PENDING",
        providerSentAt: null,
        providerLastCheckedAt: new Date(),
        providerSyncError: technicalError,
        awaitingManualComments: Boolean(order.customComments),
        error: null,
      },
    });
  }

  return {
    orderId: order.id,
    providerName: order.service.provider.name,
    sent: addResult.ok,
    apiOrderId: addResult.ok ? addResult.apiOrderId : undefined,
    error: addResult.ok ? undefined : (addResult.error || addResult.raw),
  };
}

async function escalateStuckOrders() {
  try {
    const settings = await getSettings(["stuck_order_threshold_hours", "stuck_cancel_confirm_hours"]);
    const thresholdHours = parsePositiveHours(settings.stuck_order_threshold_hours, DEFAULT_STUCK_THRESHOLD_HOURS);
    const confirmHours = parsePositiveHours(settings.stuck_cancel_confirm_hours, DEFAULT_CANCEL_CONFIRM_HOURS);
    const stuckTimeCutoff = new Date(Date.now() - thresholdHours * 3_600_000);
    const confirmCutoff = new Date(Date.now() - confirmHours * 3_600_000);

    // ── Aşama 2: İptal talebi gönderilmiş ama sağlayıcı süresinde onaylamadı ──
    // Sağlayıcı "Canceled" dönene kadar sync bekler; onay gelmezse sipariş sonsuza
    // kadar beklemede kalır. Belirli bir süre sonunda askıda olarak işaretlenir.
    const unconfirmed = await db.order.updateMany({
      where: {
        stuckAt: null,
        status: { in: ["PENDING", "PROCESSING"] },
        OR: [
          { error: "cancel_requested" },
          { providerStatus: "CANCEL_REQUESTED" },
        ],
        cancelledAt: { lte: confirmCutoff },
      },
      data: {
        stuckAt: new Date(),
        stuckReason: "İptal talebi sağlayıcı tarafından süresinde onaylanmadı",
      },
    });
    if (unconfirmed.count > 0) {
      console.log(`[Stuck Escalation] ${unconfirmed.count} sipariş "iptal onaylanmadı" nedeniyle askıya alındı`);
      await notifyStuckOrders("İptal talebi sağlayıcı tarafından süresinde onaylanmadı");
    }

    // ── Aşama 1: Eşiği aşan, sağlayıcıya gitmiş siparişler ──
    // canCancel olanlarda sağlayıcıya GERÇEK iptal talebi gönderilir;
    // sağlayıcı kabul ederse normal sync akışı Canceled durumunu görünce iadeyi otomatik yapar.
    // Sağlayıcı reddederse (örn. "sipariş başladı") sipariş askıda işaretlenir.
    // Eşik: global ayar VE servisin kendi ortalama tamamlanma süresinin 3 katının büyük olanı.
    const stuckCandidates = await db.order.findMany({
      where: {
        stuckAt: null,
        status: { in: ["PENDING", "PROCESSING"] },
        apiOrderId: { not: null },
        service: {
          providerId: { not: null },
          provider: { status: true },
        },
        // NULL semantics: Prisma/SQL `not` filtresi NULL satırları dışladığı için
        // açık OR blokları gerekli — error/providerStatus NULL adaylar kaybolmasın.
        OR: [{ providerStatus: null }, { providerStatus: { not: "CANCEL_REQUESTED" } }],
        AND: [
          { OR: [{ error: null }, { error: { not: "awaiting_payment" } }] },
          { OR: [{ error: null }, { error: { not: "cancel_requested" } }] },
        ],
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        apiOrderId: true,
        service: {
          select: {
            name: true,
            canCancel: true,
            avgCompletionMinutes: true,
            completedOrderCount: true,
            provider: { select: { apiUrl: true, apiKey: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    let processed = 0;
    for (const order of stuckCandidates) {
      if (processed >= STUCK_ESCALATION_BATCH) break;

      // Servis geçmişte bu hızda tamamlanıyorsa global eşik servise göre esnetilir
      // (yeterli istatistik varsa). Aşırı değerler 7 günde sınırlanır.
      const serviceAvgHours =
        order.service.completedOrderCount >= 5 && (order.service.avgCompletionMinutes ?? 0) > 0
          ? Math.min(((order.service.avgCompletionMinutes ?? 0) * 3) / 60, 24 * 7)
          : 0;
      const effectiveCutoffMs = Math.max(thresholdHours, serviceAvgHours) * 3_600_000;
      if (Date.now() - order.createdAt.getTime() < effectiveCutoffMs) continue;
      processed += 1;
      const provider = order.service.provider;

      // Sağlayıcı iptal desteklemiyorsa deneme yapmanın anlamı yok — doğrudan askıda işaretle
      if (!order.service.canCancel || !provider || !order.apiOrderId) {
        await markOrderStuck(order.id, order.userId, order.service.name, "Servis iptal desteklemiyor");
        continue;
      }

      try {
        const cancelResult = await cancelProviderOrders(provider.apiUrl, provider.apiKey, [order.apiOrderId]);

        if (cancelResult.ok && cancelResult.cancelled.includes(order.apiOrderId)) {
          // İptal talebi kabul edildi — sync sağlayıcı "Canceled" raporlayınca iadeyi otomatik yapar
          await db.order.update({
            where: { id: order.id },
            data: {
              providerStatus: "CANCEL_REQUESTED",
              cancelledAt: new Date(),
              error: "cancel_requested",
              providerLastCheckedAt: new Date(),
            },
          });
          console.log(`[Stuck Escalation] Sipariş #${order.id} için sağlayıcıya iptal talebi gönderildi`);
          continue;
        }

        if (cancelResult.ok && cancelResult.failed.length > 0) {
          // Sağlayıcı isteği AÇIKÇA reddetti — tekrar tekrar denemek yerine askıya al
          const reason = cancelResult.failed[0]?.error || "Sağlayıcı iptal kabul etmedi";
          await markOrderStuck(order.id, order.userId, order.service.name, `Sağlayıcı iptal kabul etmedi: ${reason}`);
          continue;
        }

        // Ağ/HTTP hatası — geçici olabilir, bu turda dokunma; sonraki turda yeniden dene
        console.warn(`[Stuck Escalation] Sipariş #${order.id} iptal isteği gönderilemedi (geçici hata)`);
      } catch (err) {
        console.error(`[Stuck Escalation Error] Order #${order.id}:`, err);
      }
    }

    // ── Aşama 1b: Sağlayıcıya hiç gidememiş eski siparişler ──
    // Gönderim kalıcı olarak başarısızsa (sürekli ağ hatası vb.) adminde görünsün.
    const sendStuck = await db.order.updateMany({
      where: {
        stuckAt: null,
        status: "PENDING",
        apiOrderId: null,
        createdAt: { lte: stuckTimeCutoff },
        // NULL semantics: error NULL olanlar da aday
        OR: [{ error: null }, { error: { not: "awaiting_payment" } }],
      },
      data: {
        stuckAt: new Date(),
        stuckReason: "Sipariş sağlayıcıya iletilemedi",
      },
    });
    if (sendStuck.count > 0) {
      console.log(`[Stuck Escalation] ${sendStuck.count} sipariş "sağlayıcıya iletilemedi" nedeniyle askıya alındı`);
      await notifyStuckOrders("Sipariş sağlayıcıya iletilemedi");
    }
  } catch (err) {
    console.error("[Stuck Escalation Error] Scan failed:", err);
  }
}

async function markOrderStuck(orderId: string, userId: string, serviceName: string, reason: string) {
  const updated = await db.order.updateMany({
    where: { id: orderId, stuckAt: null },
    data: { stuckAt: new Date(), stuckReason: reason.slice(0, 500) },
  });
  if (updated.count === 0) return;

  console.log(`[Stuck Escalation] Sipariş #${orderId} askıya alındı: ${reason}`);
  await createUserNotification({
    userId,
    type: "ORDER_UPDATE",
    title: "Siparişiniz gecikiyor",
    message: `${serviceName} siparişiniz beklenenden uzun sürüyor. Ekibimiz durumu inceliyor; dilerseniz destek ekibine yazabilirsiniz.`,
    link: "/dashboard/orders",
  }).catch(() => {});
}

/** Aşama 2'de toplu işaretlenen siparişlerin sahiplerine tek tek bildirim gönderir. */
async function notifyStuckOrders(reason: string) {
  const recentlyStuck = await db.order.findMany({
    where: {
      stuckReason: reason,
      stuckAt: { gte: new Date(Date.now() - 5 * 60_000) },
    },
    select: { id: true, userId: true, service: { select: { name: true } } },
    take: 50,
  });

  for (const order of recentlyStuck) {
    await createUserNotification({
      userId: order.userId,
      type: "ORDER_UPDATE",
      title: "Siparişiniz gecikiyor",
      message: `${order.service.name} siparişiniz beklenenden uzun sürüyor. Ekibimiz durumu inceliyor; dilerseniz destek ekibine yazabilirsiniz.`,
      link: "/dashboard/orders",
    }).catch(() => {});
  }
}

export type AdminStuckOrderAction = "recheck" | "cancel_provider" | "cancel_refund" | "mark_completed";

export type AdminStuckOrderResult = {
  ok: boolean;
  message: string;
  refundedAmount?: number;
};

/**
 * Adminin askıda sipariş için aldığı aksiyonları uygular.
 * Para hareketi içeren işlemler atomiktir: yalnızca terminal olmayan
 * durumdan geçiş olduğunda iade uygulanır (double-refund korumalı).
 */
export async function adminResolveStuckOrder(
  orderId: string,
  action: AdminStuckOrderAction
): Promise<AdminStuckOrderResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      charge: true,
      quantity: true,
      remains: true,
      startCount: true,
      apiOrderId: true,
      providerSentAt: true,
      service: {
        select: {
          name: true,
          provider: { select: { name: true, apiUrl: true, apiKey: true, status: true } },
        },
      },
    },
  });

  if (!order) return { ok: false, message: "Sipariş bulunamadı." };

  if (action === "recheck") {
    // Askıda bayrağını kaldır, durum sorgusunu zorla: sağlayıcı arada tamamlamış olabilir.
    await db.order.updateMany({
      where: { id: order.id, status: { in: ["PENDING", "PROCESSING"] } },
      data: {
        stuckAt: null,
        stuckReason: null,
        providerLastCheckedAt: null,
        // Henüz sağlayıcıya gitmediyse gönderim kilidini de sıfırla
        ...(order.apiOrderId ? {} : { providerSentAt: null }),
      },
    });
    await syncOrderWithProvider(order.id).catch(() => {});
    return { ok: true, message: "Sipariş yeniden kontrol ediliyor." };
  }

  if (action === "mark_completed") {
    const updated = await db.order.updateMany({
      where: { id: order.id, status: { notIn: ["CANCELED", "PARTIAL", "REFUNDED", "COMPLETED"] } },
      data: {
        status: "COMPLETED",
        remains: 0,
        error: null,
        providerSyncError: null,
        stuckAt: null,
        stuckReason: null,
      },
    });
    if (updated.count === 0) return { ok: false, message: "Sipariş zaten sonuçlanmış." };

    await notifyOrderStatus({
      userId: order.userId,
      orderId: order.id,
      serviceName: order.service.name,
      status: "COMPLETED",
    });
    return { ok: true, message: "Sipariş tamamlandı olarak işaretlendi." };
  }

  if (action === "cancel_provider") {
    if (!order.apiOrderId || !order.service.provider?.status) {
      return { ok: false, message: "Bu sipariş sağlayıcıya gitmemiş; doğrudan iptal + iade kullanın." };
    }

    const provider = order.service.provider;
    const cancelResult = await cancelProviderOrders(provider.apiUrl, provider.apiKey, [order.apiOrderId]);

    if (cancelResult.ok && cancelResult.cancelled.includes(order.apiOrderId)) {
      // Askıdan çık, normal iptal-onay akışına dön: sync "Canceled" görünce iadeyi otomatik yapar.
      await db.order.updateMany({
        where: { id: order.id, status: { in: ["PENDING", "PROCESSING"] } },
        data: {
          providerStatus: "CANCEL_REQUESTED",
          cancelledAt: new Date(),
          error: "cancel_requested",
          stuckAt: null,
          stuckReason: null,
          providerLastCheckedAt: new Date(),
        },
      });
      return { ok: true, message: "İptal talebi sağlayıcıya gönderildi. Onaylanınca iade otomatik yapılacak." };
    }

    const reason = cancelResult.failed[0]?.error || "Sağlayıcı iptal kabul etmedi";
    await db.order.updateMany({
      where: { id: order.id, status: { in: ["PENDING", "PROCESSING"] } },
      data: { stuckReason: `Sağlayıcı iptal kabul etmedi: ${reason}`.slice(0, 500) },
    });
    return { ok: false, message: `Sağlayıcı iptal kabul etmedi: ${reason}` };
  }

  // cancel_refund: sağlayıcıyı beklemeden yerel iptal + orantılı iade.
  // Sağlayıcıya da iptal gönderilmeye çalışılır; sonuç iadeyi etkilemez.
  if (order.apiOrderId && order.service.provider?.status) {
    await cancelProviderOrders(order.service.provider.apiUrl, order.service.provider.apiKey, [order.apiOrderId])
      .catch(() => null);
  }

  const refundAmount = computeOrderCancelRefund({
    charge: order.charge,
    quantity: order.quantity,
    remains: order.remains,
    startCount: order.startCount,
  });
  const nextCharge = Number(Math.max(order.charge - refundAmount, 0).toFixed(4));

  let refunded = 0;
  let applied = false;
  await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: { notIn: ["CANCELED", "PARTIAL", "REFUNDED", "COMPLETED"] } },
      data: {
        status: "CANCELED",
        charge: nextCharge,
        remains: order.quantity,
        refundedAmount: refundAmount > 0 ? refundAmount : undefined,
        cancelledAt: new Date(),
        error: null,
        providerSyncError: "Admin tarafından askıda sipariş olarak iptal edildi",
        providerStatus: "CANCELED_LOCAL",
        stuckAt: new Date(),
        stuckReason: "Admin tarafından iptal edilip iade yapıldı",
      },
    });

    if (updated.count === 0) return;

    applied = true;
    refunded = refundAmount;
    if (refundAmount > 0) {
      await applyUserMoneyDelta(tx, order.userId, {
        balance: refundAmount,
        spent: -refundAmount,
      });
    }
  });

  if (!applied) {
    return { ok: false, message: "Sipariş zaten sonuçlanmış." };
  }

  await notifyOrderStatus({
    userId: order.userId,
    orderId: order.id,
    serviceName: order.service.name,
    status: "CANCELED",
    refundedAmount: refunded,
  });

  return {
    ok: true,
    message: refunded > 0
      ? `Sipariş iptal edildi, ${refunded.toFixed(2)} TL müşteriye iade edildi.`
      : "Sipariş iptal edildi. Teslim edilen kısım için iade hesaplanmadı.",
    refundedAmount: refunded,
  };
}

export async function syncProviderOrdersBatch(limit = 25, trigger = "manual") {
  const startedAt = new Date();
  await escalateStuckOrders();
  const staleCutoff = new Date(Date.now() - PROVIDER_STATUS_REFRESH_MS);
  const sendRetryCutoff = new Date(Date.now() - SEND_CLAIM_TIMEOUT_MS);
  const orders = await db.order.findMany({
    where: {
      service: {
        providerId: { not: null },
      },
      status: {
        in: ["PENDING", "PROCESSING"],
      },
      AND: [
        // Ödeme henüz onaylanmamış siparişleri atla (awaiting_payment)
        {
          OR: [
            { error: null },
            { error: { not: "awaiting_payment" } },
          ],
        },
        {
          OR: [
            {
              apiOrderId: null,
              OR: [
                { providerLastCheckedAt: null },
                { providerLastCheckedAt: { lte: sendRetryCutoff } },
              ],
            },
            {
              apiOrderId: { not: null },
              OR: [
                { providerLastCheckedAt: null },
                { providerLastCheckedAt: { lte: staleCutoff } },
              ],
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      apiOrderId: true,
      service: {
        select: {
          provider: {
            select: {
              apiUrl: true,
              apiKey: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  const results: SyncOrderResult[] = [];

  const withoutApiOrderId = orders.filter((order) => !order.apiOrderId);
  const withApiOrderId = orders.filter((order) => order.apiOrderId && order.service.provider);

  for (const order of withoutApiOrderId) {
    results.push(await syncOrderWithProvider(order.id));
  }

  const providerGroups = new Map<string, Array<{ id: string; apiOrderId: string }>>();

  for (const order of withApiOrderId) {
    const provider = order.service.provider;
    if (!provider || !order.apiOrderId) continue;
    const key = `${provider.apiUrl}::${provider.apiKey}`;
    const current = providerGroups.get(key) || [];
    current.push({ id: order.id, apiOrderId: order.apiOrderId });
    providerGroups.set(key, current);
  }

  for (const [providerKey, groupOrders] of providerGroups.entries()) {
    const [apiUrl, apiKey] = providerKey.split("::");
    const orderIds = groupOrders.map((item) => item.apiOrderId);

    const batch = await getProviderOrdersStatusBatch({
      apiUrl,
      apiKey,
      apiOrderIds: orderIds,
    });

    // Toplu endpoint desteklenmiyorsa veya parse edilemiyorsa tekli fallback.
    if (!batch.ok) {
      for (const order of groupOrders) {
        results.push(await syncOrderWithProvider(order.id));
      }
      continue;
    }

    const batchResults = "results" in batch ? batch.results : undefined;

    for (const order of groupOrders) {
      const statusFromBatch = batchResults?.[order.apiOrderId];
      if (!statusFromBatch) {
        results.push(await syncOrderWithProvider(order.id));
        continue;
      }

      if (!statusFromBatch.status) {
        await db.order.update({
          where: { id: order.id },
          data: {
            providerRawStatus: statusFromBatch.rawStatus || "unknown",
            providerSyncError: `Unmapped provider status: ${statusFromBatch.rawStatus || "unknown"}`,
            providerLastCheckedAt: new Date(),
          },
        });

        results.push({
          orderId: order.id,
          sent: true,
          synced: false,
          refundedAmount: 0,
          error: `Unmapped provider status: ${statusFromBatch.rawStatus || "unknown"}`,
        });
        continue;
      }

      // Mevcut refund/notification kurallarini merkezi fonksiyondan kacirmamak icin
      // tekli sync fonksiyonunu tekrar cagiriyoruz; batch sonucu burada sadece hizlandirma/erken parse kontrolu saglar.
      results.push(await syncOrderWithProvider(order.id, statusFromBatch));
    }
  }

  const summary = {
    scanned: orders.length,
    synced: results.filter((item) => item.synced).length,
    sent: results.filter((item) => item.sent).length,
    refundedTotal: Number(results.reduce((sum, item) => sum + item.refundedAmount, 0).toFixed(4)),
    failures: results.filter((item) => item.error).length,
    results,
  };

  await createJobRunSafe({
    jobName: "provider-sync",
    status: summary.failures > 0 ? (summary.synced > 0 ? "PARTIAL" : "FAILED") : "SUCCESS",
    trigger,
    scanned: summary.scanned,
    synced: summary.synced,
    sent: summary.sent,
    failures: summary.failures,
    refundedTotal: summary.refundedTotal,
    details: JSON.stringify(summary.results),
    startedAt,
    finishedAt: new Date(),
  });

  return summary;
}

export async function syncRecentOrdersForUser(
  userId: string,
  options?: { limit?: number; minRefreshMs?: number }
) {
  const limit = Math.max(1, Math.min(8, options?.limit ?? 5));
  const minRefreshMs = Math.max(8_000, options?.minRefreshMs ?? 12_000);
  const staleCutoff = new Date(Date.now() - minRefreshMs);
  const sendRetryCutoff = new Date(Date.now() - SEND_CLAIM_TIMEOUT_MS);

  const orders = await db.order.findMany({
    where: {
      userId,
      service: {
        providerId: { not: null },
      },
      status: {
        in: ["PENDING", "PROCESSING"],
      },
      AND: [
        {
          OR: [
            { error: null },
            { error: { not: "awaiting_payment" } },
          ],
        },
        {
          OR: [
            {
              apiOrderId: null,
              OR: [
                { providerLastCheckedAt: null },
                { providerLastCheckedAt: { lte: sendRetryCutoff } },
              ],
            },
            {
              apiOrderId: { not: null },
              OR: [
                { providerLastCheckedAt: null },
                { providerLastCheckedAt: { lte: staleCutoff } },
              ],
            },
          ],
        },
      ],
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const results: SyncOrderResult[] = [];

  for (const order of orders) {
    results.push(await syncOrderWithProvider(order.id));
  }

  return {
    scanned: orders.length,
    synced: results.filter((item) => item.synced).length,
    failures: results.filter((item) => item.error).length,
  };
}
