import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPolarConfig, verifyPolarWebhook } from "@/lib/polar";
import { createBulkUserNotifications, notifyPaymentResult } from "@/lib/services/notifications";
import { applyUserMoneyDelta } from "@/lib/money";

type LockedPayment = {
  id: string;
  userId: string;
  amount: number;
  status: string;
  method: string;
  externalId: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    // Header'ları bir Record olarak alalım
    const headers: Record<string, string> = {};
    request.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    const config = await getPolarConfig();
    if (!config.webhookSecret) {
      console.warn("[Polar Callback] Webhook secret yapılandırılmamış.");
      return new NextResponse("WEBHOOK_SECRET_MISSING", { status: 400 });
    }

    // 1. Signature Doğrula
    const isVerified = verifyPolarWebhook(rawBody, headers, config.webhookSecret);
    if (!isVerified) {
      console.error("[Polar Callback] İmza doğrulaması başarısız.");
      return new NextResponse("INVALID_SIGNATURE", { status: 400 });
    }

    const body = JSON.parse(rawBody);
    const { type, data } = body;

    // Yalnızca kesin ödeme olayı bakiye yükleyebilir. `order.created` henüz
    // PENDING olabilir ve ödeme kanıtı değildir.
    if (type === "order.paid") {
      const metadata = data?.metadata || {};
      const paymentId = metadata.paymentId;

      if (!paymentId || data?.paid !== true || data?.status !== "paid") {
        console.warn("[Polar Callback] Metadata içinde paymentId bulunamadı:", data?.id);
        return new NextResponse("INVALID_PAYMENT_EVENT", { status: 400 });
      }

      await processPolarPayment({
        paymentId,
        orderId: data.id,
        checkoutId: data.checkout_id,
        status: "paid",
      });
    }

    return new NextResponse("OK");
  } catch (error) {
    console.error("[Polar Callback] Genel Hata:", error);
    return new NextResponse("PROCESSING_ERROR", { status: 500 });
  }
}

async function processPolarPayment(input: { paymentId: string; orderId: string; checkoutId?: string; status: string }) {
  const { paymentId, orderId, checkoutId, status } = input;

  await db.$transaction(async (tx) => {
    const payments = await tx.$queryRaw<LockedPayment[]>`
      SELECT id, "userId", amount, status, method, "externalId"
      FROM "Payment" 
      WHERE id = ${paymentId} 
      FOR UPDATE
    `;
    const payment = payments[0];

    if (!payment) {
      console.warn("[Polar Callback] Ödeme kaydı bulunamadı:", paymentId);
      return;
    }

    if (payment.status !== "PENDING") {
      return;
    }

    if (payment.method !== "POLAR" || !checkoutId || payment.externalId !== checkoutId) {
      throw new Error("Polar checkout eşleşmesi doğrulanamadı");
    }

    // Ödemeyi tamamla ve bakiyeyi güncelle
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        gatewayStatus: status,
        externalId: orderId,
      },
    });

    await applyUserMoneyDelta(tx, payment.userId, { balance: payment.amount });

    // Bildirimleri oluştur
    await createBulkUserNotifications([
      {
        userId: payment.userId,
        type: "PAYMENT",
        title: "Polar.sh Bakiye Yükleme Başarılı",
        message: `${payment.amount.toFixed(2)} TL bakiye hesabınıza başarıyla eklendi.`,
        link: "/dashboard/add-funds",
      },
      {
        userId: payment.userId,
        type: "BALANCE",
        title: "Bakiye Güncellendi",
        message: `Yeni yükleme (Polar): +${payment.amount.toFixed(2)} TL`,
        link: "/dashboard/add-funds",
      },
    ]);

    console.log(`[Polar Callback] Bakiye yükleme başarılı: user=${payment.userId}, tutar=${payment.amount} TL`);
  }, {
    timeout: 10000,
  });
}
