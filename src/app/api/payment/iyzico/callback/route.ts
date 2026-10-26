import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retrieveIyzicoCheckoutResult } from "@/lib/iyzico";
import { sendOrderToProvider } from "@/lib/services/provider-order-sync";
import { parseDashboardPaymentMeta } from "@/lib/services/dashboard-checkout";
import { createBulkUserNotifications, notifyPaymentResult } from "@/lib/services/notifications";
import { getAppOrigin } from "@/lib/app-url";
import { applyUserMoneyDelta } from "@/lib/money";

function scheduleProviderDispatch(orderIds: string[]) {
  after(async () => {
    for (const orderId of orderIds) {
      try {
        await sendOrderToProvider(orderId);
      } catch (error) {
        console.error("[iyzico Callback] Sağlayıcı gönderimi ertelendi:", { orderId, error });
      }
    }
  });
}

type ProcessIyzicoCallbackInput = {
  paymentId: string;
  status: "SUCCESS" | "FAILURE";
  errorMessage: string | null;
  paidPrice?: number;
};

function failedPaymentData(input: ProcessIyzicoCallbackInput, fallbackReason?: string) {
  return {
    status: "FAILED" as const,
    gatewayStatus: input.status,
    failureCode: "IYZICO_FAILED",
    failureReason: input.errorMessage ?? fallbackReason ?? "Ödeme tamamlanamadı",
  };
}

function completedPaymentData(input: ProcessIyzicoCallbackInput) {
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

export async function POST(request: NextRequest) {
  let paymentId = "";
  let redirectUrl = "/";
  
  try {
    const baseUrl = getAppOrigin();
    
    // Tarayıcı yönlendirme varsayılanları
    redirectUrl = `${baseUrl}/dashboard/add-funds?status=error`;

    const formData = await request.formData();
    const token = formData.get("token") as string;

    if (!token) {
      console.error("[iyzico Callback] İstekte token bulunamadı.");
      return htmlRedirect(`${baseUrl}/dashboard/add-funds?status=error&error=token_missing`);
    }

    // iyzico API'sinden ödeme sonucunu sorgula
    const result = await retrieveIyzicoCheckoutResult(token);
    paymentId = result.basketId || "";

    if (!paymentId) {
      console.error("[iyzico Callback] Sorgulama sonucunda basketId (paymentId) bulunamadı.");
      return htmlRedirect(`${baseUrl}/dashboard/add-funds?status=error&error=payment_id_missing`);
    }

    // Ödeme kaydını veritabanından çek
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, userId: true, amount: true, status: true, method: true, externalId: true, gatewayStatus: true },
    });

    if (!payment) {
      console.error(`[iyzico Callback] Veritabanında ödeme bulunamadı: ${paymentId}`);
      return htmlRedirect(`${baseUrl}/dashboard/add-funds?status=error&error=payment_not_found`);
    }

    if (
      result.status === "SUCCESS" &&
      (!Number.isFinite(Number(result.paidPrice)) || Math.abs(Number(payment.amount.toFixed(2)) - Number(result.paidPrice)) > 0.01)
    ) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          gatewayStatus: "AMOUNT_MISMATCH",
          failureCode: "IYZICO_AMOUNT_MISMATCH",
          failureReason: "iyzico tahsilat tutarı beklenen ödeme tutarıyla eşleşmedi",
        },
      });
      console.error("[iyzico Callback] Tutar doğrulaması başarısız:", { paymentId: payment.id });
      return htmlRedirect(`${baseUrl}/dashboard/add-funds?status=error&error=amount_mismatch`);
    }

    // Yönlendirme adreslerini metot tipine göre özelleştir
    if (payment.method.startsWith("RETAIL_")) {
      redirectUrl = result.status === "SUCCESS"
        ? `${baseUrl}/order-tracking?paymentId=${payment.id}&status=paid`
        : `${baseUrl}/order-tracking?paymentId=${payment.id}&status=failed`;
    } else if (payment.method.startsWith("DASHBOARD_ORDER")) {
      redirectUrl = result.status === "SUCCESS"
        ? `${baseUrl}/dashboard/orders?status=success`
        : `${baseUrl}/dashboard/orders?status=failed`;
    } else {
      redirectUrl = result.status === "SUCCESS"
        ? `${baseUrl}/dashboard/add-funds?status=success`
        : `${baseUrl}/dashboard/add-funds?status=error`;
    }

    // Idempotency: Eğer zaten işlendiyse sadece yönlendir
    if (payment.status !== "PENDING") {
      return htmlRedirect(redirectUrl);
    }
    if (payment.gatewayStatus === "__PROCESSING__") {
      return htmlRedirect(redirectUrl);
    }
    const claim = await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING", gatewayStatus: payment.gatewayStatus },
      data: { gatewayStatus: "__PROCESSING__" },
    });
    if (claim.count !== 1) {
      return htmlRedirect(redirectUrl);
    }

    // Arka plan işleme mantığı (PayTR ile aynı)
    const callbackInput: ProcessIyzicoCallbackInput = {
      paymentId: payment.id,
      status: result.status,
      errorMessage: result.errorMessage || null,
      paidPrice: result.paidPrice,
    };

    if (payment.method === "DASHBOARD_ORDER_IYZICO" || payment.method === "DASHBOARD_MASS_IYZICO") {
      const meta = parseDashboardPaymentMeta(payment.externalId);

      if (!meta) {
        await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(callbackInput, "Dashboard payment metadata okunamadı") });
        return htmlRedirect(redirectUrl);
      }

      if (result.status === "SUCCESS") {
        let createdCount = 0;
        const createdOrderIds: string[] = [];

        // v2: Callback anında siparişlerin oluşturulması
        if (meta.serviceId && meta.quantity && meta.links && meta.chargePerOrder !== undefined) {
          const minimumPaymentSurplus = dashboardPaymentSurplus(meta, payment.amount);
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
              data: completedPaymentData(callbackInput),
            });
            await applyUserMoneyDelta(tx, payment.userId, {
              balance: minimumPaymentSurplus - meta.appliedBalance,
              spent: meta.totalCharge,
            });
            return orderIds;
          });
          createdOrderIds.push(...ids);
          createdCount = createdOrderIds.length;

          // Siparişleri dış sağlayıcıya gönder
          const immediateIds = meta.kind === "single" ? createdOrderIds : createdOrderIds.slice(0, 5);
          scheduleProviderDispatch(immediateIds);
        }

        await notifyPaymentResult({
          userId: payment.userId,
          ok: true,
          title: "Ödeme tamamlandı",
          message: `${createdCount} sipariş için ödeme başarıyla alındı.${dashboardPaymentSurplus(meta, payment.amount) > 0 ? ` Fazladan alınan ${dashboardPaymentSurplus(meta, payment.amount).toFixed(2)} TL bakiyenize eklendi.` : ""}`,
          link: "/dashboard/orders",
        });

        console.log(`[iyzico Callback] Dashboard sipariş ödemesi başarılı: payment=${payment.id}`);
      } else {
        await db.payment.update({
          where: { id: payment.id },
          data: failedPaymentData(callbackInput),
        });

        await notifyPaymentResult({
          userId: payment.userId,
          ok: false,
          title: "Ödeme başarısız",
          message: "Sipariş ödemesi tamamlanamadı.",
          link: "/dashboard/orders",
        });

        console.log(`[iyzico Callback] Dashboard sipariş ödemesi başarısız: payment=${payment.id}`);
      }
    } else if (payment.method === "RETAIL_IYZICO") {
      const externalId = payment.externalId ?? "";

      if (externalId.startsWith("RETAIL_V2:")) {
        if (result.status !== "SUCCESS") {
          await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(callbackInput) });
          console.log(`[iyzico Callback] Retail V2 ödeme başarısız: payment=${payment.id}`);
          return htmlRedirect(redirectUrl);
        }

        type RetailV2Meta = {
          kind: "single" | "combo";
          link: string;
          charge: number;
          paytrAmount?: number; // iyzicoAmount olarak da kullanılabilir
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
          console.error("[iyzico Callback] RETAIL_V2: metadata parse hatası:", payment.id);
          await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(callbackInput, "Retail V2 metadata parse hatası") });
          return htmlRedirect(redirectUrl);
        }

        let orderInputs: Array<{ serviceId: string; link: string; quantity: number; charge: number; comments?: string }>;
        if (meta.kind === "single") {
          if (!meta.serviceId || !meta.quantity) {
            await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(callbackInput, "Retail V2 single metadata eksik") });
            return htmlRedirect(redirectUrl);
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
            await db.payment.update({ where: { id: payment.id }, data: failedPaymentData(callbackInput, "Retail V2 combo metadata eksik") });
            return htmlRedirect(redirectUrl);
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
            data: { ...completedPaymentData(callbackInput), externalId: newExternalId },
          });
          if (retailMinimumSurplus > 0) {
            await applyUserMoneyDelta(tx, payment.userId, { balance: retailMinimumSurplus });
          }
          return ids;
        });

        scheduleProviderDispatch(orderIds);

        await notifyPaymentResult({
          userId: payment.userId,
          ok: true,
          title: "Ödeme alındı",
          message: meta.kind === "combo"
            ? `Combo siparişiniz (${orderIds.length} kalem) ödemeniz alındı ve işleme alındı.`
            : "Sipariş ödemeniz alındı ve siparişiniz işleme alındı.",
          link: "/dashboard/orders",
        });

        console.log(`[iyzico Callback] Retail V2 ödeme başarılı: payment=${payment.id}, orders=${orderIds.join(",")}`);
      }
    } else {
      // Bakiye yükleme (Add-Funds)
      if (result.status === "SUCCESS") {
        const payingUser = await db.user.findUnique({
          where: { id: payment.userId },
          select: { referredById: true, username: true },
        });
        const referralCommission = payingUser?.referredById
          ? Number((payment.amount * 0.05).toFixed(4))
          : 0;

        await db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: completedPaymentData(callbackInput),
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

        // Referans komisyonu
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

        console.log(`[iyzico Callback] Bakiye yükleme başarılı: user=${payment.userId}, tutar=${payment.amount} TL`);
      } else {
        await db.payment.update({
          where: { id: payment.id },
          data: failedPaymentData(callbackInput),
        });

        await notifyPaymentResult({
          userId: payment.userId,
          ok: false,
          title: "Bakiye yükleme başarısız",
          message: "Bakiye yükleme ödemesi başarısız oldu.",
          link: "/dashboard/add-funds",
        });

        console.log(`[iyzico Callback] Bakiye yükleme başarısız: payment=${payment.id}`);
      }
    }

    return htmlRedirect(redirectUrl);
  } catch (error) {
    console.error("[iyzico Callback] Genel Hata:", error);
    if (paymentId) {
      await db.payment.updateMany({
        where: { id: paymentId, status: "PENDING", gatewayStatus: "__PROCESSING__" },
        data: { gatewayStatus: null },
      }).catch(() => {});
    }
    return htmlRedirect(redirectUrl);
  }
}

/**
 * Next.js App Router POST callback isteklerinden sonra tarayıcıyı yönlendirmek için HTML kodu döner
 */
function htmlRedirect(url: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Yönlendiriliyorsunuz...</title>
  <script>window.location.replace("${url}");</script>
</head>
<body>
  <p>Ödeme işlemi tamamlandı. Yönlendiriliyorsunuz, lütfen bekleyin...</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
