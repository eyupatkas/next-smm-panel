import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPayTRConfig, createPayTRToken } from "@/lib/paytr";
import { areCardPaymentsDisabled, getSettings } from "@/lib/settings";
import { headers } from "next/headers";
import { getAppOrigin } from "@/lib/app-url";
import { resolvePayTRMoney } from "@/lib/request-currency";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }

    const settings = await getSettings(["paytr_enabled", "paytr_test_mode"]);
    if (settings.paytr_enabled !== "1") {
      return NextResponse.json({ error: "PayTR aktif değil" }, { status: 400 });
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
        method: "PAYTR",
        status: "PENDING",
        externalId: `PAYTR-${Date.now()}`,
      },
      select: { id: true },
    });

    const config = await getPayTRConfig();

    // Kullanıcı IP'sini al
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const userIp =
      (forwardedFor ? forwardedFor.split(",")[0].trim() : null) ??
      realIp ??
      "127.0.0.1";

    const baseUrl = getAppOrigin();
    const requestLocale = String(request.cookies.get("NEXT_LOCALE")?.value ?? "tr");
    const paytrMoney = await resolvePayTRMoney(request, amount, requestLocale);

    let token: string;

    try {
      token = await createPayTRToken({
        merchantId: config.merchantId,
        merchantKey: config.merchantKey,
        merchantSalt: config.merchantSalt,
        userIp,
        merchantOid: payment.id,
        email: user.email,
        paymentAmount: paytrMoney.minorAmount,
        basketItems: [
          {
            name: "Bakiye Yükleme",
            price: paytrMoney.gatewayAmount.toFixed(2),
            count: 1,
          },
        ],
        userName: user.name ?? user.email,
        userAddress: "Türkiye",
        userPhone: user.phone ?? "05000000000",
        merchantOkUrl: `${baseUrl}/dashboard/add-funds?status=success`,
        merchantFailUrl: `${baseUrl}/dashboard/add-funds?status=fail`,
        currency: paytrMoney.paytrCurrency,
        testMode: settings.paytr_test_mode === "1" ? "1" : "0",
        noInstallment: "1",
        lang: paytrMoney.lang,
      });
    } catch (tokenError) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          gatewayStatus: "token_error",
          failureCode: "TOKEN_CREATE_FAILED",
          failureReason:
            tokenError instanceof Error ? tokenError.message : "PayTR token oluşturulamadı",
        },
      });
      throw tokenError;
    }

    return NextResponse.json({
      token,
      paymentId: payment.id,
      paymentCurrency: paytrMoney.paytrCurrencyCode,
      gatewayAmount: paytrMoney.gatewayAmount,
    });
  } catch (error) {
    console.error("[PayTR] Token oluşturma hatası:", error);
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
