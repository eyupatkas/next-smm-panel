import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyPaymentCancelToken } from "@/lib/payment-cancel-token";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (rateLimit(`retail-cancel:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: "Çok fazla istek." }, { status: 429 });
    }

    const body = (await request.json()) as { paymentId?: string; cancelToken?: string };
    const paymentId = String(body.paymentId ?? "").trim();
    const cancelToken = String(body.cancelToken ?? "").trim();

    if (!paymentId || !cancelToken || !verifyPaymentCancelToken(paymentId, cancelToken)) {
      return NextResponse.json({ error: "Gecerli bir odeme kaydi gerekli." }, { status: 400 });
    }

    const payment = await db.payment.findFirst({
      where: {
        id: paymentId,
        method: "RETAIL_PAYTR",
        status: "PENDING",
        externalId: { startsWith: "RETAIL_V2:" },
      },
      select: { id: true },
    });

    if (!payment) {
      return NextResponse.json({ success: true, canceled: false });
    }

    const result = await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status: "FAILED",
        gatewayStatus: "abandoned",
        failureCode: "CUSTOMER_CLOSED_IFRAME",
        failureReason: "Müşteri PayTR ödeme penceresini kapattı veya siparişten vazgeçti.",
      },
    });

    return NextResponse.json({ success: true, canceled: result.count === 1 });
  } catch (error) {
    console.error("[Checkout/RetailCancel] Hata:", error);
    return NextResponse.json(
      { error: "Odeme oturumu kapatilamadi." },
      { status: 500 },
    );
  }
}
