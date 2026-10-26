import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPolarConfig, createPolarCheckout } from "@/lib/polar";
import { areCardPaymentsDisabled, getUsdToTryRate } from "@/lib/settings";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getAppOrigin } from "@/lib/app-url";

export async function POST(request: NextRequest) {
  try {
    if (areCardPaymentsDisabled()) {
      return NextResponse.json({ error: "Kartla ödeme kapalı. Kripto veya havale / EFT ile bakiye yükleyebilirsiniz." }, { status: 410 });
    }
    const ip = getClientIp(request);
    if (rateLimit(`payment-create:${ip}`, 5, 60_000)) {
      return NextResponse.json({ error: "Çok fazla istek yaptınız. Lütfen 1 dakika sonra tekrar deneyin." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { amount } = await request.json();
    const numAmount = Number(amount);
    
    if (!numAmount || !Number.isFinite(numAmount) || numAmount < 50) {
      return NextResponse.json({ error: "Geçersiz tutar. Minimum yükleme tutarı 50 TL'dir." }, { status: 400 });
    }

    const config = await getPolarConfig();
    if (!config.enabled || !config.apiKey || !config.productId) {
      return NextResponse.json({ error: "Polar.sh ödeme yöntemi şu an aktif değil." }, { status: 400 });
    }

    // 1. Veritabanında geçici ödeme kaydı oluştur
    const payment = await db.payment.create({
      data: {
        userId: session.user.id,
        amount: numAmount,
        method: "POLAR",
        status: "PENDING",
      },
    });

    const usdToTryRate = await getUsdToTryRate();
    const amountInUSD = numAmount / usdToTryRate;
    const amountInCents = Math.round(amountInUSD * 100);

    const origin = getAppOrigin();
    const successUrl = `${origin}/dashboard/add-funds?status=success&payment_id=${payment.id}`;

    try {
      // 2. Polar API üzerinden checkout oturumu oluştur
      const result = await createPolarCheckout(
        {
          amountInCents,
          currency: "USD",
          successUrl,
          paymentId: payment.id,
        },
        config
      );

      // 3. Ödeme kaydını Polar Checkout ID'si ile güncelle
      await db.payment.update({
        where: { id: payment.id },
        data: { externalId: result.id },
      });

      return NextResponse.json({ url: result.url, paymentId: payment.id });
    } catch (apiError: any) {
      console.error("[Polar Create] API Hatası:", apiError);
      
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: apiError.message || "Polar API baglanti hatasi",
        },
      });

      return NextResponse.json({ error: apiError.message || "Ödeme bağlantısı oluşturulamadı." }, { status: 500 });
    }
  } catch (error) {
    console.error("[Polar Create] Genel Hata:", error);
    return NextResponse.json({ error: "Sistem hatası oluştu." }, { status: 500 });
  }
}
