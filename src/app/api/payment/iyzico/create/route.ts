import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createIyzicoCheckoutForm } from "@/lib/iyzico";
import { areCardPaymentsDisabled, getSettings } from "@/lib/settings";
import { headers } from "next/headers";
import { getAppOrigin } from "@/lib/app-url";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    if (areCardPaymentsDisabled()) {
      return NextResponse.json({ error: "Kartla ödeme kapalı. Kripto veya havale / EFT ile bakiye yükleyebilirsiniz." }, { status: 410 });
    }
    const ip = getClientIp(request);
    if (rateLimit(`iyzico-create:${ip}`, 5, 60_000)) {
      return NextResponse.json(
        { error: "Çok fazla istek yaptınız. Lütfen 1 dakika sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }

    const settings = await getSettings(["iyzico_enabled"]);
    if (settings.iyzico_enabled !== "1") {
      return NextResponse.json({ error: "iyzico ödeme yöntemi aktif değil" }, { status: 400 });
    }

    const body = (await request.json()) as { amount?: unknown };
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount < 50) {
      return NextResponse.json({ error: "Geçersiz tutar (minimum 50 TL)" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // İşlem kaydı oluştur
    const payment = await db.payment.create({
      data: {
        userId: user.id,
        amount,
        method: "IYZICO",
        status: "PENDING",
        externalId: `IYZICO-${Date.now()}`,
      },
      select: { id: true },
    });

    // Kullanıcı IP ve Host bilgilerini al
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const userIp =
      (forwardedFor ? forwardedFor.split(",")[0].trim() : null) ??
      realIp ??
      "127.0.0.1";

    const baseUrl = getAppOrigin();

    // İsim / Soyisim ayırma mantığı
    const fullName = user.name || user.email.split("@")[0] || "Müşteri";
    const nameParts = fullName.trim().split(" ");
    const surname = nameParts.length > 1 ? nameParts.pop()! : "Müşteri";
    const name = nameParts.join(" ") || "Müşteri";

    const stringAmount = amount.toFixed(2);

    try {
      const checkoutForm = await createIyzicoCheckoutForm({
        conversationId: `CONV_${payment.id}`,
        price: stringAmount,
        paidPrice: stringAmount,
        basketId: payment.id,
        callbackUrl: `${baseUrl}/api/payment/iyzico/callback`,
        buyer: {
          id: user.id,
          name: name.slice(0, 50),
          surname: surname.slice(0, 50),
          gsmNumber: user.phone || "+905000000000",
          email: user.email,
          identityNumber: "11111111111", // Default TC (iyzico zorunlu alanı)
          registrationAddress: "Türkiye",
          ip: userIp,
          city: "Istanbul",
          country: "Turkey",
        },
        billingAddress: {
          contactName: `${name} ${surname}`.slice(0, 50),
          city: "Istanbul",
          country: "Turkey",
          address: "Türkiye",
        },
        basketItems: [
          {
            id: `BI_${payment.id.slice(-8)}`,
            name: "Bakiye Yükleme",
            category: "Bakiye",
            itemType: "VIRTUAL",
            price: stringAmount,
          },
        ],
      });

      return NextResponse.json({
        token: checkoutForm.token,
        checkoutFormContent: checkoutForm.checkoutFormContent,
        paymentPageUrl: checkoutForm.paymentPageUrl,
        paymentId: payment.id,
      });
    } catch (formError) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          gatewayStatus: "token_error",
          failureCode: "IYZICO_FORM_CREATE_FAILED",
          failureReason: formError instanceof Error ? formError.message : "iyzico form oluşturulamadı",
        },
      });
      throw formError;
    }
  } catch (error) {
    console.error("[iyzico] Checkout hatası:", error);
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
