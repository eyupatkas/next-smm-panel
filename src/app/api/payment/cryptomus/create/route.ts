import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCryptomusConfig, createCryptomusInvoice } from "@/lib/cryptomus";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getAppOrigin } from "@/lib/app-url";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (rateLimit(`payment-create:${ip}`, 5, 60_000)) {
      return NextResponse.json({ error: "Çok fazla istek yaptınız. Lütfen 1 dakika sonra tekrar deneyin." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { amount, crypto } = await request.json();
    const numAmount = Number(amount);
    
    if (!numAmount || !Number.isFinite(numAmount) || numAmount < 50) {
      return NextResponse.json({ error: "Geçersiz tutar. Minimum yükleme tutarı 50 TL'dir." }, { status: 400 });
    }

    const config = await getCryptomusConfig();
    if (!config.enabled || !config.merchantId || !config.apiKey) {
      return NextResponse.json({ error: "Cryptomus ödeme yöntemi şu an aktif değil." }, { status: 400 });
    }

    // 1. Veritabanında geçici ödeme kaydı oluştur
    const payment = await db.payment.create({
      data: {
        userId: session.user.id,
        amount: numAmount,
        method: "CRYPTOMUS",
        status: "PENDING",
      },
    });

    // Sunucu adresi ve URL'leri yapılandır
    const origin = getAppOrigin();
    const urlCallback = `${origin}/api/payment/cryptomus/callback`;
    const urlReturn = `${origin}/dashboard/add-funds?status=success`;

    try {
      let toCurrency: string | undefined;
      let network: string | undefined;

      if (crypto && typeof crypto === "string" && crypto.includes(":")) {
        const [c, n] = crypto.split(":");
        toCurrency = c;
        network = n;
      }

      // 2. Cryptomus API üzerinden fatura oluştur
      const result = await createCryptomusInvoice(
        {
          amount: numAmount.toFixed(2),
          currency: "TRY",
          orderId: payment.id,
          urlCallback,
          urlReturn,
          toCurrency,
          network,
        },
        config
      );

      // 3. Ödeme kaydını Cryptomus UUID ile güncelle (Webhook eşleşmesi için)
      await db.payment.update({
        where: { id: payment.id },
        data: { externalId: result.uuid },
      });

      return NextResponse.json({ url: result.url, paymentId: payment.id });
    } catch (apiError: any) {
      console.error("[Cryptomus Create] API Hatası:", apiError);
      
      // Hata durumunda oluşturulan ödemeyi FAILED olarak güncelle
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: apiError.message || "API baglanti hatasi",
        },
      });

      return NextResponse.json({ error: apiError.message || "Ödeme bağlantısı oluşturulamadı." }, { status: 500 });
    }
  } catch (error) {
    console.error("[Cryptomus Create] Genel Hata:", error);
    return NextResponse.json({ error: "Sistem hatası oluştu." }, { status: 500 });
  }
}
