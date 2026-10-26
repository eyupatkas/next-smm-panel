import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCryptomusConfig, verifyCryptomusSignature } from "@/lib/cryptomus";
import { createBulkUserNotifications, notifyPaymentResult } from "@/lib/services/notifications";
import { sendOrderToProvider } from "@/lib/services/provider-order-sync";
import { parseDashboardPaymentMeta } from "@/lib/services/dashboard-checkout";
import { applyUserMoneyDelta } from "@/lib/money";

function scheduleProviderDispatch(orderIds: string[]) {
  after(async () => {
    for (const orderId of orderIds) {
      try {
        await sendOrderToProvider(orderId);
      } catch (error) {
        console.error("[Cryptomus Callback] Sağlayıcı gönderimi ertelendi:", { orderId, error });
      }
    }
  });
}

export async function POST(request: NextRequest) {
  let callbackPaymentId = "";
  try {
    const body = await request.json();
    const { sign, order_id, status, uuid, amount, type, is_final } = body;
    callbackPaymentId = typeof order_id === "string" ? order_id : "";

    const invoiceAmount = Number(amount);
    if (!sign || !order_id || !status || !uuid || type !== "payment" || !Number.isFinite(invoiceAmount)) {
      console.warn("[Cryptomus Callback] Eksik parametreler.");
      return new NextResponse("BAD_REQUEST", { status: 400 });
    }

    const config = await getCryptomusConfig();

    // 1. Signature Doğrula
    const data = { ...body };
    delete data.sign;

    if (!verifyCryptomusSignature(data, String(sign), config.apiKey)) {
      console.error("[Cryptomus Callback] Imza dogrulamasi basarisiz:", { order_id });
      return new NextResponse("INVALID_SIGNATURE", { status: 400 });
    }

    // Yerel ödeme/bakiye kaydı kalıcı olmadan OK dönme. Sağlayıcı siparişleri
    // ayrı çalışır ve provider-sync tarafından yeniden yakalanabilir.
    await processCryptomusCallback({ orderId: order_id, status, uuid, invoiceAmount, isFinal: is_final === true });

    return new NextResponse("OK");
  } catch (error) {
    console.error("[Cryptomus Callback] Hata:", error);
    if (callbackPaymentId) {
      await db.payment.updateMany({
        where: { id: callbackPaymentId, status: "PENDING", gatewayStatus: "__PROCESSING__" },
        data: { gatewayStatus: null },
      }).catch(() => {});
    }
    return new NextResponse("PROCESSING_ERROR", { status: 500 });
  }
}

async function processCryptomusCallback(input: { orderId: string; status: string; uuid: string; invoiceAmount: number; isFinal: boolean }) {
  const { orderId, status, uuid, invoiceAmount, isFinal } = input;

  const payment = await db.payment.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, amount: true, status: true, method: true, externalId: true, gatewayStatus: true },
  });

  if (!payment) {
    console.warn("[Cryptomus Callback] Payment bulunamadi:", orderId);
    return;
  }

  if (payment.status !== "PENDING") {
    return;
  }
  if (payment.gatewayStatus === "__PROCESSING__") return;

  const isSuccess = isFinal && (status === "paid" || status === "paid_over");
  const isFailure = isFinal && ["fail", "cancel", "wrong_amount", "system_fail"].includes(status);
  if (!isSuccess && !isFailure) return;
  if (isSuccess && Math.abs(Number(payment.amount.toFixed(2)) - invoiceAmount) > 0.001) {
    console.error("[Cryptomus Callback] Fatura tutarı ödeme kaydıyla eşleşmiyor:", { orderId });
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        gatewayStatus: "AMOUNT_MISMATCH",
        failureCode: "CRYPTOMUS_AMOUNT_MISMATCH",
        failureReason: "Cryptomus tahsilat tutarı beklenen ödeme tutarıyla eşleşmedi",
      },
    });
    return;
  }

  const claim = await db.payment.updateMany({
    where: { id: payment.id, status: "PENDING", gatewayStatus: payment.gatewayStatus },
    data: { gatewayStatus: "__PROCESSING__" },
  });
  if (claim.count !== 1) return;

  if (isSuccess) {
    if (payment.method === "DASHBOARD_ORDER_CRYPTOMUS" || payment.method === "DASHBOARD_MASS_CRYPTOMUS") {
      const meta = parseDashboardPaymentMeta(payment.externalId);

      if (!meta) {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            gatewayStatus: status,
            externalId: uuid,
            failureReason: "Dashboard payment metadata okunamadı",
          },
        });
        return;
      }

      let createdCount = 0;
      const createdOrderIds: string[] = [];

      if (meta.serviceId && meta.quantity && meta.links && meta.chargePerOrder !== undefined) {
        const ids = await db.$transaction(async (tx) => {
          const orderIds: string[] = [];
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
            orderIds.push(order.id);
          }
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              gatewayStatus: status,
              externalId: uuid,
            },
          });
          await applyUserMoneyDelta(tx, payment.userId, {
            balance: -meta.appliedBalance,
            spent: meta.totalCharge,
          });
          return orderIds;
        });
        createdOrderIds.push(...ids);
        createdCount = createdOrderIds.length;

        const immediateIds = meta.kind === "single" ? createdOrderIds : createdOrderIds.slice(0, 5);
        scheduleProviderDispatch(immediateIds);
      }

      await notifyPaymentResult({
        userId: payment.userId,
        ok: true,
        title: "Kripto Ödeme Tamamlandı",
        message: `${createdCount} adet siparişinizin kripto ödemesi başarıyla onaylandı.`,
        link: "/dashboard/orders",
      });

      console.log(`[Cryptomus Callback] Dashboard kripto sipariş ödemesi başarılı: payment=${payment.id}`);
    } else if (payment.method === "RETAIL_CRYPTOMUS") {
      const externalId = payment.externalId ?? "";

      if (externalId.startsWith("RETAIL_V2:")) {
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
          console.error("[Cryptomus Callback] RETAIL_V2 parse hatası:", payment.id);
          await db.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED", gatewayStatus: status, failureReason: "Retail V2 metadata parse hatası" },
          });
          return;
        }

        let orderInputs: Array<{ serviceId: string; link: string; quantity: number; charge: number; comments?: string }>;
        if (meta.kind === "single") {
          if (!meta.serviceId || !meta.quantity) {
            await db.payment.update({
              where: { id: payment.id },
              data: { status: "FAILED", gatewayStatus: status, failureReason: "Retail V2 single metadata eksik" },
            });
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
          if (!meta.comboItems?.length) {
            await db.payment.update({
              where: { id: payment.id },
              data: { status: "FAILED", gatewayStatus: status, failureReason: "Retail V2 combo metadata eksik" },
            });
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
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              gatewayStatus: status,
              externalId: ids.length === 1 ? ids[0] : `COMBO:${ids.join(",")}`,
            },
          });
          return ids;
        });

        scheduleProviderDispatch(orderIds);

        await notifyPaymentResult({
          userId: payment.userId,
          ok: true,
          title: "Kripto Ödeme Alındı",
          message: meta.kind === "combo"
            ? `Combo siparişinizin kripto ödemesi onaylandı ve siparişleriniz işleme alındı.`
            : "Siparişinizin kripto ödemesi onaylandı ve siparişiniz işleme alındı.",
          link: "/dashboard/orders",
        });

        console.log(`[Cryptomus Callback] Retail kripto ödemesi başarılı: payment=${payment.id}, orders=${orderIds.join(",")}`);
      }
    } else {
      // Standart Bakiye Yükleme (Add-funds)
      await db.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            gatewayStatus: status,
            externalId: uuid,
          },
        });
        await applyUserMoneyDelta(tx, payment.userId, { balance: payment.amount });
      });

      await createBulkUserNotifications([
        {
          userId: payment.userId,
          type: "PAYMENT",
          title: "Kripto Bakiye Yükleme Başarılı",
          message: `${payment.amount.toFixed(2)} TL bakiye hesabınıza başarıyla eklendi.`,
          link: "/dashboard/add-funds",
        },
        {
          userId: payment.userId,
          type: "BALANCE",
          title: "Bakiye Güncellendi",
          message: `Yeni yükleme (Cryptomus): +${payment.amount.toFixed(2)} TL`,
          link: "/dashboard/add-funds",
        },
      ]);

      console.log(`[Cryptomus Callback] Bakiye yukleme basarili: user=${payment.userId}, tutar=${payment.amount} TL`);
    }
  } else if (isFailure) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        gatewayStatus: status,
        externalId: uuid,
        failureReason: `Cryptomus status: ${status}`,
      },
    });

    await notifyPaymentResult({
      userId: payment.userId,
      ok: false,
      title: "Kripto Ödeme Başarısız",
      message: "Kripto ödemeniz iptal edildi veya başarısız oldu.",
      link: "/dashboard/add-funds",
    });

    console.log(`[Cryptomus Callback] Ödeme başarısız: payment=${payment.id}`);
  }
}
