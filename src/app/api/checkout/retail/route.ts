import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPayTRConfig, createPayTRToken } from "@/lib/paytr";
import { createIyzicoCheckoutForm } from "@/lib/iyzico";
import { getCryptomusConfig, createCryptomusInvoice } from "@/lib/cryptomus";
import { CRYPTOMUS_MINIMUM_TL } from "@/lib/payment-minimums";
import { getSettings, getVatRate } from "@/lib/settings";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getAppOrigin } from "@/lib/app-url";
import { createPaymentCancelToken } from "@/lib/payment-cancel-token";
import { isCustomCommentServiceType } from "@/lib/platform-utils";
import { calculateSafeServiceCharge, calculateProviderCost } from "@/lib/pricing";
import { resolvePayTRMinimum } from "@/lib/paytr-minimum";
import { resolvePayTRMoney } from "@/lib/request-currency";
import { cleanLink } from "@/lib/services/dashboard-checkout";

// ─── Güvenlik: Frontendden hiçbir fiyat bilgisi alınmaz ───────────────────────
// Fiyat tamamen veritabanından (Package.retailPrice ?? Package.price) hesaplanır.

function buildGuestUsername(email: string) {
  const base = email
    .split("@")[0]
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 18) || "musteri";
  return `${base}${Math.floor(Date.now() / 1000).toString().slice(-6)}`;
}

function normalizeTarget(value: unknown) {
  return cleanLink(String(value ?? "").trim()).slice(0, 500);
}

function isValidTarget(value: string) {
  return value.length >= 2 && value.length <= 500 && !/[\u0000-\u001f]/.test(value);
}

export async function POST(request: NextRequest) {
  // Rate limit: her IP'den 60 saniyede 10 istek
  const ip = getClientIp(request);
  if (rateLimit(`checkout:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
  }

  try {
    const vatRate = await getVatRate();
    // ── Gelen verileri al (frontendden SADECE sipariş bilgileri, FİYAT YOK) ──
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const requestedPaymentMethod = String(body.paymentMethod || "PAYTR").trim().toUpperCase();

    if (requestedPaymentMethod !== "CRYPTOMUS") {
      return NextResponse.json({ error: "Doğrudan sipariş ödemesi kapatıldı. Lütfen kripto veya havale / EFT ile bakiye yükleyip siparişinizi oluşturun." }, { status: 400 });
    }
    const paymentMethod: string = requestedPaymentMethod;
    const settings = await getSettings(["paytr_enabled", "paytr_test_mode", "iyzico_enabled", "cryptomus_enabled"]);

    if (paymentMethod === "PAYTR" && settings.paytr_enabled !== "1") {
      return NextResponse.json({ error: "PayTR aktif değil." }, { status: 400 });
    }
    if (paymentMethod === "IYZICO" && settings.iyzico_enabled !== "1") {
      return NextResponse.json({ error: "iyzico aktif değil." }, { status: 400 });
    }
    if (paymentMethod === "CRYPTOMUS" && settings.cryptomus_enabled !== "1") {
      return NextResponse.json({ error: "Cryptomus aktif değil." }, { status: 400 });
    }

    const packageId = String(body.packageId ?? "").trim();
    const serviceId = String(body.serviceId ?? "").trim();
    const requestedQuantity = Math.floor(Number(body.quantity ?? 0));
    let customerName = String(body.customerName ?? "").trim();
    let email = String(body.email ?? "").trim().toLowerCase();
    const link = normalizeTarget(body.link);
    const submittedPhone = String(body.phone ?? "").trim() || null;
    const comments = typeof body.comments === "string" && body.comments.trim() ? body.comments.trim() : undefined;
    const requestedComboAllocations = Array.isArray(body.comboAllocations)
      ? body.comboAllocations
      : [];

    if (!packageId && !serviceId) {
      return NextResponse.json({ error: "Paket veya servis seçimi zorunludur." }, { status: 400 });
    }

    const COMMISSION_RATE = 0.05; // %5 ödeme sağlayıcı komisyonu

    const checkoutTarget = packageId
      ? await (async () => {
          const pkg = await db.package.findFirst({
            where: { id: packageId, status: true },
            select: {
              id: true,
              name: true,
              quantity: true,
              price: true,
              retailPrice: true,
              comboItems: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  serviceType: true,
                  min: true,
                  max: true,
                  externalId: true,
                  price: true,
                  retailPrice: true,
                  resellerPrice: true,
                  category: {
                    select: {
                      name: true,
                      parent: { select: { name: true } },
                    },
                  },
                  provider: {
                    select: { id: true, name: true, apiUrl: true, apiKey: true, status: true, retailMarkupPercent: true, resellerMarkupPercent: true },
                  },
                },
              },
            },
          });

          if (!pkg) {
            return null;
          }

          const packageChargeNet = Number((pkg.retailPrice ?? pkg.price).toFixed(4));
          const comboItems = Array.isArray(pkg.comboItems) ? pkg.comboItems : [];
          const providerCost = comboItems.length > 0
            ? 0
            : calculateProviderCost(pkg.service, pkg.quantity);
          const baseCharge = Number((Math.max(packageChargeNet, providerCost) * (1 + vatRate / 100)).toFixed(4));
          const charge = Number((baseCharge * (1 + COMMISSION_RATE)).toFixed(4));

          return {
            kind: "package" as const,
            basketName: pkg.name,
            quantity: pkg.quantity,
            comboItems: pkg.comboItems,
            service: pkg.service,
            baseCharge,
            charge,
          };
        })()
      : await (async () => {
          const service = await db.service.findFirst({
            where: { id: serviceId, status: true },
            select: {
              id: true,
              name: true,
              serviceType: true,
              min: true,
              max: true,
              externalId: true,
              price: true,
              retailPrice: true,
              resellerPrice: true,
              category: {
                select: {
                  name: true,
                  parent: { select: { name: true } },
                },
              },
              provider: {
                select: { id: true, name: true, apiUrl: true, apiKey: true, status: true, retailMarkupPercent: true, resellerMarkupPercent: true },
              },
            },
          });

          if (!service) {
            return null;
          }

          const baseCharge = calculateSafeServiceCharge("USER", service, requestedQuantity, undefined, vatRate).charge;
          const charge = Number((baseCharge * (1 + COMMISSION_RATE)).toFixed(4));

          return {
            kind: "service" as const,
            basketName: service.name,
            quantity: requestedQuantity,
            comboItems: null,
            service,
            baseCharge,
            charge,
          };
        })();

    if (!checkoutTarget) {
      return NextResponse.json(
        { error: packageId ? "Paket bulunamadı veya pasif." : "Servis bulunamadı veya pasif." },
        { status: 404 }
      );
    }

    if (checkoutTarget.charge <= 0 || checkoutTarget.baseCharge <= 0) {
      return NextResponse.json(
        { error: packageId ? "Geçersiz paket fiyatı." : "Geçersiz servis fiyatı." },
        { status: 400 }
      );
    }

    // ── Kullanıcı bul veya oluştur ──
    const session = await auth();
    let userId: string;
    let paytrPhone: string | null = null;

    // Admin impersonation desteği
    const jar = await cookies();
    const impersonateId =
      session?.user?.role === "ADMIN" ? jar.get("admin_impersonate")?.value : undefined;

    if (session?.user?.id) {
      const accountUser = await db.user.findUnique({
        where: { id: impersonateId ?? session.user.id },
        select: { id: true, name: true, email: true, phone: true, banned: true },
      });

      if (!accountUser?.email) {
        return NextResponse.json({ error: "Hesabınızda e-posta bilgisi eksik." }, { status: 400 });
      }
      if (accountUser.banned) {
        return NextResponse.json({ error: "Hesabınız askıya alındı." }, { status: 403 });
      }

      userId = accountUser.id;
      customerName = accountUser.name || accountUser.email.split("@")[0] || "Müşteri";
      email = accountUser.email.toLowerCase();
      paytrPhone = submittedPhone || accountUser.phone;

      if (!paytrPhone) {
        return NextResponse.json({ error: "PayTR ödemesi için telefon numarası gereklidir." }, { status: 400 });
      }

      if (submittedPhone && submittedPhone !== accountUser.phone) {
        await db.user.update({ where: { id: userId }, data: { phone: submittedPhone } });
      }
    } else {
      if (!customerName || !email || !submittedPhone) {
        return NextResponse.json({ error: "Ad soyad, e-posta ve telefon zorunludur." }, { status: 400 });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
      }

      const existingUser = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        userId = existingUser.id;
        await db.user.update({ where: { id: userId }, data: { phone: submittedPhone } });
      } else {
        const newUser = await db.user.create({
          data: {
            name: customerName,
            email,
            username: buildGuestUsername(email),
            role: "USER",
            phone: submittedPhone,
            balance: 0,
          },
          select: { id: true },
        });
        userId = newUser.id;
      }

      paytrPhone = submittedPhone;
    }

    // ── Combo paket mi yoksa tekil mi? ──
    // V2 akışı: siparişler ödeme onaylanmadan OLUŞTURULMAZ.
    // Sipariş bilgileri payment.externalId içine gömülür; callback başarılı olunca oluşturulur.
    type ComboItem = { serviceId: string; quantity: number; label?: string };
    type ComboAllocation = { serviceId: string; target: string; quantity: number };
    const comboItems = checkoutTarget.comboItems as ComboItem[] | null;
    const isCombo = Array.isArray(comboItems) && comboItems.length > 0;
    let comboAllocations: ComboAllocation[] = [];
    let comboMinimumBaseCharge = 0;

    // Doğrulama (sipariş oluşturulmadan önce kontrol)
    if (isCombo) {
      const serviceIds = comboItems!.map((i) => i.serviceId);
      const services = await db.service.findMany({
        where: { id: { in: serviceIds }, status: true },
        select: {
          id: true,
          name: true,
          min: true,
          max: true,
          price: true,
          retailPrice: true,
          resellerPrice: true,
          serviceType: true,
          provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
        },
      });
      const serviceMap = new Map(services.map((s) => [s.id, s]));
      const comboItemMap = new Map(comboItems!.map((item) => [item.serviceId, item]));
      comboMinimumBaseCharge = Number(comboItems!
        .reduce((sum, item) => {
          const service = serviceMap.get(item.serviceId);
          return sum + (service ? calculateProviderCost(service, item.quantity) : 0);
        }, 0)
        .toFixed(4));

      comboAllocations = requestedComboAllocations
        .map((entry) => {
          const raw = entry as Record<string, unknown>;
          return {
            serviceId: String(raw.serviceId ?? ""),
            target: normalizeTarget(raw.target ?? raw.link),
            quantity: Math.floor(Number(raw.quantity ?? 0)),
          };
        })
        .filter((entry) => entry.serviceId && entry.target && entry.quantity > 0);

      if (comboAllocations.length === 0) {
        return NextResponse.json({ error: "Kombo paket için hedef ve miktar dağılımı zorunludur." }, { status: 400 });
      }

      if (comboAllocations.length > 100) {
        return NextResponse.json({ error: "Tek kombo pakette en fazla 100 hedef girilebilir." }, { status: 400 });
      }

      for (const allocation of comboAllocations) {
        const comboItem = comboItemMap.get(allocation.serviceId);

        if (!comboItem) {
          return NextResponse.json({ error: "Kombo dağılımında pakete ait olmayan servis var." }, { status: 400 });
        }

        if (!isValidTarget(allocation.target)) {
          return NextResponse.json({ error: "Kombo dağılımında geçersiz hedef bilgisi var." }, { status: 400 });
        }

        const service = serviceMap.get(allocation.serviceId);
        if (!service) {
          return NextResponse.json({ error: "Kombo içindeki bir servis bulunamadı veya pasif." }, { status: 400 });
        }

        if (allocation.quantity > comboItem.quantity) {
          return NextResponse.json(
            { error: `${service.name}: tek hedef miktarı paket hakkını aşamaz.` },
            { status: 400 }
          );
        }
      }

      for (const item of comboItems!) {
        const service = serviceMap.get(item.serviceId);
        if (!service) {
          return NextResponse.json({ error: `Combo içindeki bir servis bulunamadı veya pasif.` }, { status: 400 });
        }

        const allocatedQuantity = comboAllocations
          .filter((allocation) => allocation.serviceId === item.serviceId)
          .reduce((sum, allocation) => sum + allocation.quantity, 0);

        if (allocatedQuantity !== item.quantity) {
          const label = item.label || service.name;
          return NextResponse.json(
            { error: `${label}: toplam dağıtım ${item.quantity.toLocaleString("tr-TR")} olmalı.` },
            { status: 400 }
          );
        }
      }
    } else {
      const isCustomCommentsPackage = isCustomCommentServiceType({
        serviceType: checkoutTarget.service.serviceType,
        name: checkoutTarget.service.name,
        categoryName: checkoutTarget.service.category.name,
        parentCategoryName: checkoutTarget.service.category.parent?.name,
      });

      if (!isValidTarget(link)) {
        return NextResponse.json({ error: "Geçerli bir link veya kullanıcı adı girin." }, { status: 400 });
      }

      if (
        checkoutTarget.quantity < checkoutTarget.service.min ||
        checkoutTarget.quantity > checkoutTarget.service.max
      ) {
        return NextResponse.json(
          {
            error:
              checkoutTarget.kind === "package"
                ? "Paket miktarı servis limitleri ile uyumsuz."
                : `Miktar ${checkoutTarget.service.min.toLocaleString("tr-TR")} ile ${checkoutTarget.service.max.toLocaleString("tr-TR")} arasında olmalıdır.`,
          },
          { status: 400 }
        );
      }

      if (isCustomCommentsPackage) {
        const commentCount = comments
          ?.split("\n")
          .map((line) => line.trim())
          .filter(Boolean).length ?? 0;

        if (commentCount === 0) {
          return NextResponse.json(
            {
              error:
                checkoutTarget.kind === "package"
                  ? "Bu paket için özel yorumlar zorunludur."
                  : "Bu servis için özel yorumlar zorunludur.",
            },
            { status: 400 }
          );
        }

        if (commentCount !== checkoutTarget.quantity) {
          return NextResponse.json({
            error:
              checkoutTarget.kind === "package"
                ? `Bu paket için tam ${checkoutTarget.quantity.toLocaleString("tr-TR")} yorum satırı girmelisiniz.`
                : `Bu servis için tam ${checkoutTarget.quantity.toLocaleString("tr-TR")} yorum satırı girmelisiniz.`,
          }, { status: 400 });
        }
      }
    }
    type RetailV2Meta = {
      kind: "single" | "combo";
      link: string;
      charge: number;
      paytrAmount: number;
      paymentCurrency?: string;
      gatewayAmount?: number;
      displayCurrency?: string;
      minimumPaymentApplied?: boolean;
      minimumPaymentSurplus?: number;
      comments?: string;
      serviceId?: string;
      quantity?: number;
      comboItems?: Array<{ serviceId: string; quantity: number }>;
      comboAllocations?: Array<{ serviceId: string; target: string; quantity: number }>;
      placedByAgent?: boolean;
    };
    const finalBaseCharge = Math.max(checkoutTarget.baseCharge, comboMinimumBaseCharge);
    const finalCharge = Number((finalBaseCharge * (1 + COMMISSION_RATE)).toFixed(4));
    const requestLocale = String(request.cookies.get("NEXT_LOCALE")?.value ?? "tr");

    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp       = headersList.get("x-real-ip");
    const userIp =
      (forwardedFor ? forwardedFor.split(",")[0].trim() : null) ??
      realIp ??
      "127.0.0.1";

    const baseUrl = getAppOrigin();

    let token: string | undefined;
    let paymentPageUrl: string | undefined;
    let cryptomusUrl: string | undefined;
    let paymentId: string;
    let responsePayload: any = {};

    if (paymentMethod === "PAYTR") {
      const paytrMinimum = resolvePayTRMinimum(finalCharge);
      const paytrAmount = paytrMinimum.payableAmount;
      const paytrMoney = await resolvePayTRMoney(request, paytrAmount, requestLocale);

      const v2Meta: RetailV2Meta = isCombo
        ? {
            kind: "combo",
            link: "",
            charge: finalCharge,
            paytrAmount,
            paymentCurrency: paytrMoney.paytrCurrencyCode,
            gatewayAmount: paytrMoney.gatewayAmount,
            displayCurrency: paytrMoney.displayCurrencyCode,
            minimumPaymentApplied: paytrMinimum.applied,
            minimumPaymentSurplus: paytrMinimum.surplusAmount,
            comboItems: comboItems!.map((i) => ({ serviceId: i.serviceId, quantity: i.quantity })),
            comboAllocations,
            placedByAgent: body.placedByAgent === true,
          }
        : {
            kind: "single",
            link,
            charge: finalCharge,
            paytrAmount,
            paymentCurrency: paytrMoney.paytrCurrencyCode,
            gatewayAmount: paytrMoney.gatewayAmount,
            displayCurrency: paytrMoney.displayCurrencyCode,
            minimumPaymentApplied: paytrMinimum.applied,
            minimumPaymentSurplus: paytrMinimum.surplusAmount,
            serviceId: checkoutTarget.service.id,
            quantity: checkoutTarget.quantity,
            comments: comments ?? undefined,
            placedByAgent: body.placedByAgent === true,
          };

      // ── Ödeme kaydı oluştur ──
      const payment = await db.payment.create({
        data: {
          userId,
          amount: paytrAmount,
          method: "RETAIL_PAYTR",
          status: "PENDING",
          externalId: `RETAIL_V2:${JSON.stringify(v2Meta)}`,
        },
        select: { id: true },
      });

      paymentId = payment.id;
      const config = await getPayTRConfig();

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true, phone: true },
      });

      try {
        token = await createPayTRToken({
          merchantId:   config.merchantId,
          merchantKey:  config.merchantKey,
          merchantSalt: config.merchantSalt,
          userIp,
          merchantOid:  payment.id,
          email,
          paymentAmount: paytrMoney.minorAmount,
          basketItems: [
            {
              name:  checkoutTarget.basketName.slice(0, 60),
              price: paytrMoney.gatewayAmount.toFixed(2),
              count: 1,
            },
          ],
          userName:    (user?.name ?? customerName).slice(0, 60),
          userAddress: "Türkiye",
          userPhone:   (user?.phone ?? paytrPhone ?? "05000000000").slice(0, 20),
          merchantOkUrl:   `${baseUrl}/order-tracking?paymentId=${payment.id}&status=paid`,
          merchantFailUrl: `${baseUrl}/order-tracking?paymentId=${payment.id}&status=failed`,
          currency:    paytrMoney.paytrCurrency,
          testMode:    settings.paytr_test_mode === "1" ? "1" : "0",
          noInstallment: "1",
          lang:        paytrMoney.lang,
        });
      } catch (tokenError) {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            gatewayStatus: "token_error",
            failureCode: "TOKEN_CREATE_FAILED",
            failureReason: tokenError instanceof Error ? tokenError.message : "PayTR token oluşturulamadı",
          },
        });
        throw tokenError;
      }

      responsePayload = {
        token,
        paymentId: payment.id,
        shortId:   payment.id.slice(-8).toUpperCase(),
        paytrAmount,
        paymentCurrency: paytrMoney.paytrCurrencyCode,
        gatewayAmount: paytrMoney.gatewayAmount,
        minimumPaymentApplied: paytrMinimum.applied,
        minimumPaymentOriginalAmount: paytrMinimum.originalAmount,
        minimumPaymentSurplus: paytrMinimum.surplusAmount,
        message: paytrMinimum.applied
          ? `PayTR minimum ödeme tutarı 1,00 TL olduğu için karttan ${paytrMoney.gatewayAmount.toFixed(2)} ${paytrMoney.paytrCurrencyCode} alınacak. Sipariş tutarınız ${checkoutTarget.charge.toFixed(2)} TL; aradaki ${paytrMinimum.surplusAmount.toFixed(2)} TL hesabınıza bakiye olarak eklenecek.`
          : undefined,
      };

    } else if (paymentMethod === "IYZICO") {
      const v2Meta: RetailV2Meta = isCombo
        ? {
            kind: "combo",
            link: "",
            charge: finalCharge,
            paytrAmount: finalCharge, // iyzicoAmount olarak kullanılacak
            comboItems: comboItems!.map((i) => ({ serviceId: i.serviceId, quantity: i.quantity })),
            comboAllocations,
            placedByAgent: body.placedByAgent === true,
          }
        : {
            kind: "single",
            link,
            charge: finalCharge,
            paytrAmount: finalCharge,
            serviceId: checkoutTarget.service.id,
            quantity: checkoutTarget.quantity,
            comments: comments ?? undefined,
            placedByAgent: body.placedByAgent === true,
          };

      const payment = await db.payment.create({
        data: {
          userId,
          amount: finalCharge,
          method: "RETAIL_IYZICO",
          status: "PENDING",
          externalId: `RETAIL_V2:${JSON.stringify(v2Meta)}`,
        },
        select: { id: true },
      });

      paymentId = payment.id;

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true, phone: true },
      });

      const fullName = user?.name ?? customerName;
      const nameParts = fullName.trim().split(" ");
      const surname = nameParts.length > 1 ? nameParts.pop()! : "Müşteri";
      const name = nameParts.join(" ") || "Müşteri";

      const stringAmount = finalCharge.toFixed(2);

      try {
        const checkoutForm = await createIyzicoCheckoutForm({
          conversationId: `CONV_${payment.id}`,
          price: stringAmount,
          paidPrice: stringAmount,
          basketId: payment.id,
          callbackUrl: `${baseUrl}/api/payment/iyzico/callback`,
          buyer: {
            id: userId,
            name: name.slice(0, 50),
            surname: surname.slice(0, 50),
            gsmNumber: user?.phone ?? paytrPhone ?? "+905000000000",
            email,
            identityNumber: "11111111111",
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
              name: checkoutTarget.basketName.slice(0, 60),
              category: "Sipariş",
              itemType: "VIRTUAL",
              price: stringAmount,
            },
          ],
        });

        token = checkoutForm.token;
        paymentPageUrl = checkoutForm.paymentPageUrl;
      } catch (tokenError) {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            gatewayStatus: "token_error",
            failureCode: "IYZICO_FORM_CREATE_FAILED",
            failureReason: tokenError instanceof Error ? tokenError.message : "iyzico checkout form oluşturulamadı",
          },
        });
        throw tokenError;
      }

      responsePayload = {
        token,
        paymentPageUrl,
        paymentId: payment.id,
        shortId: payment.id.slice(-8).toUpperCase(),
        gatewayAmount: finalCharge,
      };

    } else if (paymentMethod === "CRYPTOMUS") {
      // Cryptomus küçük tutarlı fatura açmayı reddediyor; kullanıcıya baştan net söyle.
      if (finalCharge < CRYPTOMUS_MINIMUM_TL) {
        return NextResponse.json(
          {
            error: `Kripto para ile ödeme yalnızca ${CRYPTOMUS_MINIMUM_TL.toFixed(2)} TL ve üzeri siparişlerde kullanılabilir. Lütfen sipariş tutarını yükseltin.`,
          },
          { status: 400 }
        );
      }

      const v2Meta: RetailV2Meta = isCombo
        ? {
            kind: "combo",
            link: "",
            charge: finalCharge,
            paytrAmount: finalCharge, // cryptomusAmount olarak kullanılacak
            comboItems: comboItems!.map((i) => ({ serviceId: i.serviceId, quantity: i.quantity })),
            comboAllocations,
            placedByAgent: body.placedByAgent === true,
          }
        : {
            kind: "single",
            link,
            charge: finalCharge,
            paytrAmount: finalCharge,
            serviceId: checkoutTarget.service.id,
            quantity: checkoutTarget.quantity,
            comments: comments ?? undefined,
            placedByAgent: body.placedByAgent === true,
          };

      const payment = await db.payment.create({
        data: {
          userId,
          amount: finalCharge,
          method: "RETAIL_CRYPTOMUS",
          status: "PENDING",
          externalId: `RETAIL_V2:${JSON.stringify(v2Meta)}`,
        },
        select: { id: true },
      });

      paymentId = payment.id;
      const cryptomusConfig = await getCryptomusConfig();

      try {
        const invoice = await createCryptomusInvoice(
          {
            amount: finalCharge.toFixed(2),
            currency: "TRY",
            orderId: payment.id,
            urlCallback: `${baseUrl}/api/payment/cryptomus/callback`,
            urlReturn: `${baseUrl}/order-tracking?paymentId=${payment.id}&status=paid`,
          },
          cryptomusConfig
        );

        cryptomusUrl = invoice.url;
      } catch (invoiceError) {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            gatewayStatus: "token_error",
            failureCode: "CRYPTOMUS_INVOICE_CREATE_FAILED",
            failureReason: invoiceError instanceof Error ? invoiceError.message : "Cryptomus fatura oluşturulamadı",
          },
        });
        throw invoiceError;
      }

      responsePayload = {
        url: cryptomusUrl,
        paymentId: payment.id,
        shortId: payment.id.slice(-8).toUpperCase(),
        gatewayAmount: finalCharge,
      };
    } else {
      return NextResponse.json({ error: "Geçersiz ödeme yöntemi." }, { status: 400 });
    }

    return NextResponse.json({
      ...responsePayload,
      cancelToken: createPaymentCancelToken(paymentId),
    });
  } catch (error) {
    console.error("[Checkout/Retail] Hata:", error);
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
