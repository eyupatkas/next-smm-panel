import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAppOrigin } from "@/lib/app-url";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { createPayTRToken, getPayTRConfig } from "@/lib/paytr";
import { createIyzicoCheckoutForm } from "@/lib/iyzico";
import { getSettings, getVatRate } from "@/lib/settings";
import {
  createDirectPaidOrders,
  encodeDashboardPaymentMeta,
  getCheckoutService,
  getCheckoutUser,
  getReservedDashboardBalance,
  normalizeLinks,
} from "@/lib/services/dashboard-checkout";
import { calculateSafeServiceCharge } from "@/lib/pricing";
import { db } from "@/lib/db";
import { createBulkUserNotifications } from "@/lib/services/notifications";
import { isCustomCommentServiceType } from "@/lib/platform-utils";
import { resolvePayTRMinimum } from "@/lib/paytr-minimum";
import { resolvePayTRMoney } from "@/lib/request-currency";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

type RequestBody = {
  mode?: "single" | "mass";
  serviceId?: string;
  quantity?: number;
  link?: string;
  links?: string[];
  comments?: string;
  placedByAgent?: boolean;
  paymentMethod?: "PAYTR" | "IYZICO";
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    }
    if (rateLimit(`dashboard-checkout:${session.user.id}:${getClientIp(request)}`, 15, 60_000)) {
      return NextResponse.json({ error: "Çok fazla sipariş denemesi. Lütfen bekleyin." }, { status: 429 });
    }

    // Admin impersonation desteği
    const jar = await cookies();
    const impersonateId =
      session.user.role === "ADMIN" ? jar.get("admin_impersonate")?.value : undefined;
    const userId = impersonateId ?? session.user.id;

    const body = (await request.json()) as RequestBody;
    const mode = body.mode === "mass" ? "mass" : "single";
    const serviceId = String(body.serviceId || "").trim();
    const quantity = Number(body.quantity || 0);
    const paymentMethod = body.paymentMethod === "IYZICO" ? "IYZICO" : "PAYTR";

    if (!serviceId || !quantity) {
      return NextResponse.json({ error: "Servis ve miktar zorunludur." }, { status: 400 });
    }

    const links = normalizeLinks(mode, body.link, body.links);
    const comments = typeof body.comments === "string" && body.comments.trim() ? body.comments.trim() : undefined;

    if (mode === "single" && links.length !== 1) {
      return NextResponse.json({ error: "Geçerli bir link girin." }, { status: 400 });
    }

    if (mode === "mass" && links.length === 0) {
      return NextResponse.json({ error: "En az 1 link girmelisiniz." }, { status: 400 });
    }

    if (mode === "mass" && links.length > 500) {
      return NextResponse.json({ error: "Tek seferde en fazla 500 sipariş verilebilir." }, { status: 400 });
    }

    const [user, service] = await Promise.all([
      getCheckoutUser(userId),
      getCheckoutService(serviceId),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }
    if (user.banned) {
      return NextResponse.json({ error: "Hesabınız askıya alındı." }, { status: 403 });
    }

    if (!service) {
      return NextResponse.json({ error: "Servis bulunamadı veya pasif." }, { status: 404 });
    }

    const isCustomCommentsService = isCustomCommentServiceType({
      serviceType: service.serviceType,
      name: service.name,
      categoryName: service.category.name,
      parentCategoryName: service.category.parent?.name,
    });

    if (isCustomCommentsService && !comments) {
      return NextResponse.json({
        error: "Bu servis için özel yorumlar zorunludur. Her satıra bir yorum yazın.",
      }, { status: 400 });
    }

    if (comments) {
      const commentCount = comments
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean).length;

      if (mode !== "single" || links.length !== 1) {
        return NextResponse.json({ error: "Özel yorum siparişlerinde tek link kullanılmalıdır." }, { status: 400 });
      }

      if (commentCount !== quantity) {
        return NextResponse.json({
          error: "Özel yorum siparişlerinde miktar yorum satırı sayısı ile aynı olmalıdır.",
        }, { status: 400 });
      }
    }

    if (quantity < service.min || quantity > service.max) {
      return NextResponse.json({
        error: `Miktar ${service.min.toLocaleString("tr-TR")}-${service.max.toLocaleString("tr-TR")} arasında olmalı.`,
      }, { status: 400 });
    }

    const pricing = calculateSafeServiceCharge(user.role, service, quantity, undefined, await getVatRate());
    const unitPrice = pricing.unitPrice;
    const chargePerOrder = pricing.charge;

    if (unitPrice <= 0 || chargePerOrder <= 0) {
      return NextResponse.json({ error: "Bu servisin fiyatı tanımlı değil. Lütfen destek ile iletişime geçin." }, { status: 400 });
    }

    const totalCharge = Number((chargePerOrder * links.length).toFixed(4));

    const reservedBalance = await getReservedDashboardBalance(db, user.id);
    const availableBalance = Number(Math.max(Number(user.balance) - reservedBalance, 0).toFixed(4));
    const usedBalance = Number(Math.min(availableBalance, totalCharge).toFixed(4));
    const remainingAmount = Number(Math.max(totalCharge - usedBalance, 0).toFixed(4));

    if (remainingAmount === 0) {
      const directResult = await createDirectPaidOrders({
        user,
        service,
        quantity,
        links,
        comments,
        placedByAgent: body.placedByAgent === true,
      });

      const successResults = directResult.results.filter((item) => item.ok);
      const failedResults = directResult.results.filter((item) => !item.ok);

      if (successResults.length > 0) {
        await createBulkUserNotifications(
          successResults
            .map((item) => item.orderId)
            .filter((id): id is string => Boolean(id))
            .map((orderId) => ({
              userId: user.id,
              type: "ORDER_UPDATE",
              title: "Sipariş alındı",
              message: `${service.name} siparişiniz alındı (#${orderId.slice(0, 8)}).`,
              link: "/dashboard/orders",
            }))
        );
      }

      return NextResponse.json({
        status: "created",
        message:
          mode === "single"
            ? successResults.length > 0
              ? `Sipariş oluşturuldu (#${successResults[0]?.orderId}).`
              : failedResults[0]?.error || "Sipariş oluşturulamadı."
            : `${successResults.length} sipariş oluşturuldu${failedResults.length > 0 ? `, ${failedResults.length} hata oluştu` : ""}.`,
        totalAmount: totalCharge,
        usedBalance: totalCharge,
        remainingAmount: 0,
        orderIds: successResults.map((item) => item.orderId!).filter(Boolean),
        results: mode === "mass" ? directResult.results : undefined,
      });
    }

    return NextResponse.json({
      error: `Sipariş ödemesi için bakiyeniz yetersiz. Kalan ${remainingAmount.toFixed(2)} TL tutarı Bakiye Yükle sayfasından kripto veya havale / EFT ile yükleyip siparişinizi tamamlayabilirsiniz.`,
    }, { status: 400 });


  } catch (error) {
    console.error("[Checkout/DashboardOrder] Hata:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    }, { status: 500 });
  }
}
