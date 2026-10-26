import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPayTRConfig, paytrMinorAmount, verifyPayTRCallback } from "@/lib/paytr";
import { sendOrderToProvider, syncOrderWithProvider } from "@/lib/services/provider-order-sync";
import { parseDashboardPaymentMeta } from "@/lib/services/dashboard-checkout";
import { createBulkUserNotifications, notifyPaymentResult } from "@/lib/services/notifications";
import { applyUserMoneyDelta } from "@/lib/money";

type ProcessPayTRCallbackInput = {
  merchantOid: string;
  status: string;
  totalAmountMinor: number;
  failedReasonCode: string | null;
  failedReasonMsg: string | null;
};

function scheduleProviderDispatch(orderIds: string[], legacySync = false) {
  after(async () => {
    for (const orderId of orderIds) {
      try {
        if (legacySync) await syncOrderWithProvider(orderId);
        else await sendOrderToProvider(orderId);
      } catch (error) {
        console.error("[PayTR Callback] Sağlayıcı gönderimi ertelendi:", { orderId, error });
      }
    }
  });
}

function failedPaymentData(
  input: ProcessPayTRCallbackInput,
  fallbackReason?: string,
) {
  return {
    status: "FAILED" as const,
    gatewayStatus: input.status,
    failureCode: input.failedReasonCode,
    failureReason: input.failedReasonMsg ?? fallbackReason ?? null,
  };
}

function completedPaymentData(input: ProcessPayTRCallbackInput) {
  return {
    status: "COMPLETED" as const,
    gatewayStatus: input.status,
    failureCode: null,
    failureReason: null,
  };
}

function dashboardPaymentSurplus(meta: ReturnType<typeof parseDashboardPaymentMeta>, paymentAmount: number) {
  if (!meta) return 0;
  if (typeof meta.minimumPaymentSurplus === "number") {
    return Number(Math.max(meta.minimumPaymentSurplus, 0).toFixed(4));
  }

  const remainingAmount = Number(Math.max(meta.totalCharge - meta.appliedBalance, 0).toFixed(4));
  return Number(Math.max(paymentAmount - remainingAmount, 0).toFixed(4));
}

/**
 * PayTR Ödeme Bildirimi (IPN / Callback)
 * PayTR, ödeme sonucunu bu endpoint'e POST eder.
 * Endpoint "OK" yanıtı döndürmelidir, aksi hâlde PayTR tekrar dener.
 *
 * ÖNEMLİ:
 * - merchant_oid = payment.id
 * - RETAIL_PAYTR metodu: payment.externalId = orderId
 * - PAYTR metodu (bakiye): payment.userId'ye bakiye eklenir
 */
export async function POST(request: NextRequest) {
  let callbackPaymentId = "";
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const merchant_oid = params.get("merchant_oid") ?? "";
    callbackPaymentId = merchant_oid;
    const status       = params.get("status")       ?? "";
    const total_amount = params.get("total_amount") ?? "";
    const totalAmountMinor = Number(total_amount);
    const hash         = params.get("hash")         ?? "";
    const failed_reason_code = params.get("failed_reason_code");
    const failed_reason_msg = params.get("failed_reason_msg");

    if (!merchant_oid || !status || !total_amount || !hash || !Number.isSafeInteger(totalAmountMinor) || totalAmountMinor < 1) {
      return new NextResponse("BAD_REQUEST", { status: 400 });
    }

    const config = await getPayTRConfig();

    // ── Hash doğrula (PayTR dökümana göre: HMAC-SHA256 ile imza kontrolü) ──
    if (!verifyPayTRCallback({ merchant_oid, status, total_amount, hash }, config)) {
      console.error("[PayTR Callback] Hash doğrulama başarısız:", { merchant_oid });
      return new NextResponse("INVALID_HASH", { status: 400 });
    }

    // Ödeme ve yerel sipariş kayıtları kalıcı olmadan gateway'e OK dönme.
    // Sağlayıcıya gönderim ayrıca planlanır; kaçırılırsa provider-sync tamamlar.
    await processPayTRCallback({
      merchantOid: merchant_oid,
      status,
      totalAmountMinor,
      failedReasonCode: failed_reason_code,
      failedReasonMsg: failed_reason_msg,
    });

    return new NextResponse("OK");
  } catch (error) {
    console.error("[PayTR Callback] Hata:", error);
    if (callbackPaymentId) {
      await db.payment.updateMany({
        where: { id: callbackPaymentId, status: "PENDING", gatewayStatus: "__PROCESSING__" },
        data: { gatewayStatus: null },
      }).catch(() => {});
    }
    return new NextResponse("PROCESSING_ERROR", { status: 500 });
  }
}

async function processPayTRCallback(input: ProcessPayTRCallbackInput) {
  const { merchantOid, status } = input;
    // ── Ödeme kaydını bul ──
    const payment = await db.payment.findUnique({
      where: { id: merchantOid },
      select: { id: true, userId: true, amount: true, status: true, method: true, externalId: true, gatewayStatus: true },
    });

    if (!payment) {
      console.warn("[PayTR Callback] Payment bulunamadı, işleme atlanıyor:", merchantOid);
      return;
    }

    // ── Idempotency: zaten işlendiyse tekrar işleme ──
    if (payment.status !== "PENDING") {
      return;
    }
    if (payment.gatewayStatus === "__PROCESSING__") return;
    // Token oluşturmadaki yuvarlama ile birebir aynı hesap (paytrMinorAmount).
    const expectedAmountMinor = paytrMinorAmount(payment.amount);
    if (input.totalAmountMinor !== expectedAmountMinor) {
      console.error("[PayTR Callback] Tutar doğrulaması başarısız:", { merchantOid });
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          gatewayStatus: "AMOUNT_MISMATCH",
          failureCode: "PAYTR_AMOUNT_MISMATCH",
          failureReason: "PayTR tahsilat tutarı beklenen ödeme tutarıyla eşleşmedi",
        },
      });
      return;
    }
    const claim = await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING", gatewayStatus: payment.gatewayStatus },
      data: { gatewayStatus: "__PROCESSING__" },
    });
    if (claim.count !== 1) return;

    if (payment.method === "DASHBOARD_ORDER_PAYTR" || payment.method === "DASHBOARD_MASS_PAYTR") {
      const meta = parseDashboardPaymentMeta(payment.externalId);

      if (!meta) {
        await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(input, "Dashboard payment metadata okunamadı") });
        return;
      }

      if (status === "success") {
        let createdCount = 0;

        // Determine which flow: v1 (legacy pre-created orders) vs v2 (create on callback)
        if (meta.orderIds.length > 0) {
          createdCount = meta.orderIds.length;

          // ── v1 legacy: update pre-created orders ──
          const minimumPaymentSurplus = dashboardPaymentSurplus(meta, payment.amount);
          await db.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: completedPaymentData(input),
            });
            await applyUserMoneyDelta(tx, payment.userId, {
              balance: minimumPaymentSurplus - meta.appliedBalance,
              spent: meta.totalCharge,
            });
            await tx.order.updateMany({
              where: { id: { in: meta.orderIds } },
              data: {
                status: "PENDING",
                error: null,
                providerStatus: meta.kind === "mass" ? "QUEUED" : null,
                providerRawStatus: "payment_confirmed",
                providerSyncError: null,
              },
            });
          });

          const immediateOrderIds = meta.kind === "single" ? meta.orderIds : meta.orderIds.slice(0, 5);
          scheduleProviderDispatch(immediateOrderIds);
        } else if (meta.serviceId && meta.quantity && meta.links && meta.chargePerOrder !== undefined) {
          // ── v2: create orders now, after payment confirmed ──
          const minimumPaymentSurplus = dashboardPaymentSurplus(meta, payment.amount);
          const createdOrderIds = await db.$transaction(async (tx) => {
            const ids: string[] = [];
            for (const link of meta.links!) {
              const order = await tx.order.create({
                data: {
                  userId: payment.userId,
                  serviceId: meta.serviceId!,
                  link,
                  quantity: meta.quantity!,
                  charge: meta.chargePerOrder!,
                  status: "PENDING",
                  remains: meta.quantity!,
                  customComments: meta.comments ?? null,
                  placedByAgent: Boolean(meta.placedByAgent),
                },
                select: { id: true },
              });
              ids.push(order.id);
            }
            await tx.payment.update({
              where: { id: payment.id },
              data: completedPaymentData(input),
            });
            await applyUserMoneyDelta(tx, payment.userId, {
              balance: minimumPaymentSurplus - meta.appliedBalance,
              spent: meta.totalCharge,
            });
            return ids;
          });
          createdCount = createdOrderIds.length;

          const immediateIds = meta.kind === "single" ? createdOrderIds : createdOrderIds.slice(0, 5);
          scheduleProviderDispatch(immediateIds);
        } else {
          await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(input, "Dashboard v2 metadata eksik") });
          return;
        }

        await notifyPaymentResult({
          userId: payment.userId,
          ok: true,
          title: "Ödeme tamamlandı",
          message: `${createdCount} sipariş için ödeme başarıyla alındı.${dashboardPaymentSurplus(meta, payment.amount) > 0 ? ` Fazladan alınan ${dashboardPaymentSurplus(meta, payment.amount).toFixed(2)} TL bakiyenize eklendi.` : ""}`,
          link: "/dashboard/orders",
        });

        console.log(`[PayTR Callback] Dashboard sipariş ödemesi başarılı: payment=${payment.id}, links=${meta.linkCount}`);
      } else {
        // Payment failed — for v2 there are no pre-created orders to clean up
        const ops: ReturnType<typeof db.payment.update>[] = [
          db.payment.update({ where: { id: payment.id }, data: failedPaymentData(input) }),
        ];

        if (meta.orderIds.length > 0) {
          // v1 legacy: cancel pre-created orders
          ops.push(
            db.order.updateMany({
              where: { id: { in: meta.orderIds } },
              data: {
                status: "CANCELED",
                error: "PayTR ödeme başarısız",
                providerSyncError: null,
              },
            }) as unknown as ReturnType<typeof db.payment.update>
          );
        }

        await db.$transaction(ops);

        await notifyPaymentResult({
          userId: payment.userId,
          ok: false,
          title: "Ödeme başarısız",
          message: "Sipariş ödemesi tamamlanamadı. İsterseniz tekrar deneyebilirsiniz.",
          link: "/dashboard/orders",
        });

        console.log(`[PayTR Callback] Dashboard sipariş ödemesi başarısız: payment=${payment.id}`);
      }
    } else if (payment.method === "RETAIL_PAYTR") {
      // ── Retail (paket satın alma) ödeme akışı ──
      const externalId = payment.externalId ?? "";

      if (externalId.startsWith("RETAIL_V2:")) {
        // ── V2 akışı: sipariş henüz oluşturulmadı, metadata parse edilecek ──
        if (status !== "success") {
          await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(input) });
          console.log(`[PayTR Callback] Retail V2 ödeme başarısız: payment=${payment.id}`);
          return;
        }

        // Ödeme onaylandı — siparişleri şimdi oluştur
        type RetailV2Meta = {
          kind: "single" | "combo";
          link: string;
          charge: number;
          paytrAmount?: number;
          minimumPaymentApplied?: boolean;
          minimumPaymentSurplus?: number;
          comments?: string;
          serviceId?: string;
          quantity?: number;
          comboItems?: Array<{ serviceId: string; quantity: number }>;
          comboAllocations?: Array<{ serviceId: string; target: string; quantity: number }>;
          placedByAgent?: boolean;
        };

        let meta: RetailV2Meta;
        try {
          meta = JSON.parse(externalId.slice(10)) as RetailV2Meta;
        } catch {
          console.error("[PayTR Callback] RETAIL_V2: metadata parse hatası:", payment.id);
          await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(input, "Retail V2 metadata parse hatası") });
          return;
        }

        let orderInputs: Array<{ serviceId: string; link: string; quantity: number; charge: number; comments?: string }>;
        if (meta.kind === "single") {
          if (!meta.serviceId || !meta.quantity) {
            console.error("[PayTR Callback] RETAIL_V2: eksik single metadata:", payment.id);
            await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(input, "Retail V2 single metadata eksik") });
            return;
          }
          orderInputs = [{
            serviceId: meta.serviceId,
            link: meta.link,
            quantity: meta.quantity,
            charge: meta.charge,
            comments: meta.comments,
          }];
        } else {
          // combo
          if (!meta.comboItems?.length) {
            console.error("[PayTR Callback] RETAIL_V2: eksik combo metadata:", payment.id);
            await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(input, "Retail V2 combo metadata eksik") });
            return;
          }
          orderInputs = meta.comboAllocations?.length
            ? meta.comboAllocations.map((allocation) => ({
                serviceId: allocation.serviceId,
                link: allocation.target,
                quantity: allocation.quantity,
                charge: 0,
              }))
            : meta.comboItems.map((item) => ({
                serviceId: item.serviceId,
                link: meta.link,
                quantity: item.quantity,
                charge: 0,
              }));
        }

        const retailMinimumSurplus = Number(Math.max(meta.minimumPaymentSurplus ?? 0, 0).toFixed(4));
        const orderIds = await db.$transaction(async (tx) => {
          const ids: string[] = [];
          for (const item of orderInputs) {
            const order = await tx.order.create({
              data: {
                userId: payment.userId,
                serviceId: item.serviceId,
                link: item.link,
                quantity: item.quantity,
                charge: item.charge,
                status: "PENDING",
                remains: item.quantity,
                customComments: item.comments ?? null,
                awaitingManualComments: Boolean(item.comments),
                placedByAgent: Boolean(meta.placedByAgent),
              },
              select: { id: true },
            });
            ids.push(order.id);
          }
          const newExternalId = ids.length === 1 ? ids[0] : `COMBO:${ids.join(",")}`;
          await tx.payment.update({
            where: { id: payment.id },
            data: { ...completedPaymentData(input), externalId: newExternalId },
          });
          if (retailMinimumSurplus > 0) {
            await applyUserMoneyDelta(tx, payment.userId, { balance: retailMinimumSurplus });
          }
          return ids;
        });

        // Sağlayıcıya gönder
        scheduleProviderDispatch(orderIds);

        await notifyPaymentResult({
          userId: payment.userId,
          ok: true,
          title: "Ödeme alındı",
          message:
            meta.kind === "combo"
              ? `Combo siparişiniz (${orderIds.length} kalem) ödemeniz alındı ve işleme alındı.${retailMinimumSurplus > 0 ? ` Fazladan alınan ${retailMinimumSurplus.toFixed(2)} TL bakiyenize eklendi.` : ""}`
              : `Sipariş ödemeniz alındı ve siparişiniz işleme alındı.${retailMinimumSurplus > 0 ? ` Fazladan alınan ${retailMinimumSurplus.toFixed(2)} TL bakiyenize eklendi.` : ""}`,
          link: "/dashboard/orders",
        });

        console.log(`[PayTR Callback] Retail V2 ödeme başarılı: payment=${payment.id}, orders=${orderIds.join(",")}`);
      } else {
        // ── Legacy (v1) akışı: önceden oluşturulmuş siparişler ──
        const isCombo = externalId.startsWith("COMBO:");
        const orderIds = isCombo
          ? externalId.slice(6).split(",").filter(Boolean)
          : externalId ? [externalId] : [];

        if (status === "success") {
          if (orderIds.length === 0) {
            console.error("[PayTR Callback] RETAIL_PAYTR legacy: orderId yok:", payment.id);
            await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(input, "Retail legacy orderId yok") });
            return;
          }

          // Ödeme onaylandı → tüm siparişleri aktif et
          await db.$transaction([
            db.payment.update({
              where: { id: payment.id },
              data: completedPaymentData(input),
            }),
            db.order.updateMany({
              where: { id: { in: orderIds } },
              data: {
                status: "PENDING",
                error: null,
                providerSyncError: null,
              },
            }),
          ]);

          // Sağlayıcıya gönder
          scheduleProviderDispatch(orderIds, true);

          await notifyPaymentResult({
            userId: payment.userId,
            ok: true,
            title: "Ödeme alındı",
            message: isCombo
              ? `Combo siparişiniz (${orderIds.length} kalem) ödemeniz alındı ve işleme alındı.`
              : "Sipariş ödemeniz alındı ve siparişiniz işleme alındı.",
            link: "/dashboard/orders",
          });

          console.log(`[PayTR Callback] Retail legacy ödeme başarılı: payment=${payment.id}, orders=${orderIds.join(",")}`);
        } else {
          // Ödeme başarısız — siparişleri iptal et
          await db.$transaction([
            db.payment.update({ where: { id: payment.id }, data: failedPaymentData(input) }),
            db.order.updateMany({
              where: { id: { in: orderIds } },
              data: { status: "CANCELED", error: "PayTR ödeme başarısız" },
            }),
          ]);

          await notifyPaymentResult({
            userId: payment.userId,
            ok: false,
            title: "Ödeme başarısız",
            message: "Ödemeniz başarısız oldu. Sipariş iptal edildi.",
            link: "/order-tracking",
          });

          console.log(`[PayTR Callback] Retail legacy ödeme başarısız: payment=${payment.id}`);
        }
      }
    } else {
      // ── Bakiye yükleme (dashboard add-funds) ödeme akışı ──
      if (status === "success") {
        // Referans kontrolü
        const payingUser = await db.user.findUnique({
          where: { id: payment.userId },
          select: { referredById: true, username: true },
        });
        const referralCommission = payingUser?.referredById
          ? Number((payment.amount * 0.05).toFixed(4))
          : 0;

        // Bakiye DB'deki payment.amount ile eklenir — total_amount kullanılmaz (güvenlik)
        await db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: completedPaymentData(input),
          });
          await applyUserMoneyDelta(tx, payment.userId, { balance: payment.amount });
          if (payingUser?.referredById && referralCommission > 0) {
            await tx.user.update({
              where: { id: payingUser.referredById },
              data: { referralBalance: { increment: referralCommission } },
            });
            await tx.referralTransaction.create({
              data: {
                referrerId: payingUser.referredById,
                referredId: payment.userId,
                amount: referralCommission,
                description: `${payingUser.username || "Bir üyeniz"} tarafından yapılan ₺${payment.amount.toFixed(2)} bakiye yüklemesi komisyonu`,
              },
            });
          }
        });

        // Referans ödülünü yansıt
        if (payingUser?.referredById && referralCommission > 0) {
          await createBulkUserNotifications([
            {
              userId: payingUser.referredById,
              type: "PAYMENT",
              title: "Referans kazancı yansıdı!",
              message: `Davet ettiğiniz üyenin ödemesinden ₺${referralCommission.toFixed(2)} referans bakiyenize eklendi.`,
              link: "/dashboard/referrals",
            },
          ]);
        }

        await createBulkUserNotifications([
          {
            userId: payment.userId,
            type: "PAYMENT",
            title: "Bakiye yükleme başarılı",
            message: `${payment.amount.toFixed(2)} TL bakiye hesabınıza eklendi.`,
            link: "/dashboard/add-funds",
          },
          {
            userId: payment.userId,
            type: "BALANCE",
            title: "Bakiye güncellendi",
            message: `Yeni yükleme: +${payment.amount.toFixed(2)} TL`,
            link: "/dashboard/add-funds",
          },
        ]);

        console.log(`[PayTR Callback] Bakiye yükleme başarılı: user=${payment.userId}, tutar=${payment.amount} TL`);
      } else {
        await db.payment.update({
          where: { id: payment.id },
          data: failedPaymentData(input),
        });

        await notifyPaymentResult({
          userId: payment.userId,
          ok: false,
          title: "Bakiye yükleme başarısız",
          message: "Bakiye yükleme ödemesi başarısız oldu.",
          link: "/dashboard/add-funds",
        });

        console.log(`[PayTR Callback] Bakiye yükleme başarısız: payment=${payment.id}`);
      }
    }

}
