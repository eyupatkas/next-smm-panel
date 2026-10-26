import { calculateSafeServiceCharge } from "@/lib/pricing";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createUserNotification } from "@/lib/services/notifications";
import { sendOrderToProvider } from "@/lib/services/provider-order-sync";
import { applyUserMoneyDelta } from "@/lib/money";
import { getEffectiveAvailableBalance } from "@/lib/services/dashboard-checkout";
import { getVatRate } from "@/lib/settings";

function isAuthorizedBySecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("x-cron-key") === expected;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  if (!isAdmin && !isAuthorizedBySecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all due scheduled orders
  const dueOrders = await db.scheduledOrder.findMany({
    where: {
      status: "PENDING",
      nextRunAt: { lte: now },
    },
    select: {
      id: true,
      userId: true,
      serviceId: true,
      link: true,
      quantity: true,
      charge: true,
      isRecurring: true,
      recurrenceEveryHours: true,
      recurrenceTimes: true,
      recurrenceEndAt: true,
      executedCount: true,
      executedOrderIds: true,
      nextRunAt: true,
      user: { select: { id: true, balance: true, role: true } },
      service: {
        select: {
          id: true,
          name: true,
          status: true,
          min: true,
          max: true,
          price: true,
          retailPrice: true,
          resellerPrice: true,
          serviceType: true,
          externalId: true,
          provider: {
            select: { id: true, apiUrl: true, apiKey: true, status: true, retailMarkupPercent: true, resellerMarkupPercent: true },
          },
        },
      },
    },
    take: 50,
  });

  const results: { id: string; ok: boolean; orderId?: string; error?: string }[] = [];

  for (const scheduled of dueOrders) {
    try {
      const user = scheduled.user;
      const service = scheduled.service;

      // Atomik claim: paralel cron çağrılarından yalnızca biri çalıştırabilir.
      const claim = await db.scheduledOrder.updateMany({
        where: { id: scheduled.id, status: "PENDING", nextRunAt: { lte: now } },
        data: { status: "PROCESSING" },
      });
      if (claim.count !== 1) continue;
      if (!service.status) throw new Error("SERVICE_INACTIVE");

      // Bu çalıştırmanın ücreti önceki oluşturma/çalıştırma sırasında rezerve edildi.
      // Burada tekrar düşmek yinelenen siparişleri ikinci çalıştırmadan itibaren çift ücretlendirir.
      const charge = scheduled.charge;

      // Provider gönderimi, yerel sipariş atomik olarak oluşturulduktan sonra yapılır.
      const hasProvider = Boolean(
        service.provider?.status && service.externalId && service.provider.apiUrl
      );

      // Determine if we should schedule next run or complete
      let nextStatus = "COMPLETED";
      let nextRunAt: Date | null = null;
      let nextCharge = 0;

      const newCount = scheduled.executedCount + 1;

      if (scheduled.isRecurring) {
        const hours = scheduled.recurrenceEveryHours ?? 24;
        const potentialNext = new Date(now.getTime() + hours * 3600 * 1000);

        const reachedMax =
          scheduled.recurrenceTimes != null && newCount >= scheduled.recurrenceTimes;
        const reachedEnd =
          scheduled.recurrenceEndAt != null &&
          potentialNext > new Date(scheduled.recurrenceEndAt);

        if (!reachedMax && !reachedEnd) {
          nextStatus = "PENDING";
          nextRunAt = potentialNext;
          nextCharge = calculateSafeServiceCharge(user.role, service, scheduled.quantity, undefined, await getVatRate()).charge;
        }
      }

      // Create the actual order inside transaction (atomic balance deduction and reservation)
      const newOrder = await db.$transaction(async (tx) => {
        // Taze kullanıcı bilgisini al ve kilitle
        const freshUserResult = await tx.$queryRaw<{ balance: number }[]>`
          SELECT balance FROM "User" WHERE id = ${user.id} FOR UPDATE
        `;
        const freshUser = freshUserResult[0];

        if (!freshUser) {
          throw new Error("USER_NOT_FOUND");
        }

        // Bakiye zaten rezerve edildi; yalnızca gerçekleşen harcamayı kaydet.
        await applyUserMoneyDelta(tx, user.id, { spent: charge });

        const order = await tx.order.create({
          data: {
            userId: user.id,
            serviceId: service.id,
            link: scheduled.link,
            quantity: scheduled.quantity,
            charge,
              status: "PENDING",
              apiOrderId: null,
              remains: scheduled.quantity,
              providerStatus: null,
              providerRawStatus: null,
              providerSentAt: null,
          },
          select: { id: true },
        });

        // Bir sonraki çalışma için bakiye rezerve et
        if (nextStatus === "PENDING" && nextRunAt && nextCharge > 0) {
          const cronAvailable = await getEffectiveAvailableBalance(tx, user.id, freshUser.balance);
          if (cronAvailable >= nextCharge) {
            await applyUserMoneyDelta(tx, user.id, { balance: -nextCharge });
            freshUser.balance -= nextCharge;
          } else {
            // Sonraki adım için bakiye yetersiz, tamamla
            nextStatus = "COMPLETED";
            nextRunAt = null;
          }
        }

        const newExecutedIds = [...scheduled.executedOrderIds, order.id];
        await tx.scheduledOrder.update({
          where: { id: scheduled.id },
          data: {
            status: nextStatus as never,
            charge: nextStatus === "PENDING" ? nextCharge : charge,
            executedCount: newCount,
            executedOrderIds: newExecutedIds,
            lastRunAt: now,
            nextRunAt,
            updatedAt: now,
          },
        });

        return order;
        });

      const sendResult = hasProvider ? await sendOrderToProvider(newOrder.id) : null;

      await createUserNotification({
        userId: user.id,
        type: "ORDER_UPDATE",
        title: "Zamanlanmış sipariş çalıştırıldı",
        message: `"${service.name}" zamanlanmış siparişiniz oluşturuldu. Sipariş #${newOrder.id.slice(-8).toUpperCase()}`,
        link: "/dashboard/orders",
      });

        results.push({
          id: scheduled.id,
          ok: !(sendResult?.resolved && sendResult.status === "CANCELED"),
          orderId: newOrder.id,
          error: sendResult?.resolved && sendResult.status === "CANCELED"
            ? "Sağlayıcı siparişi reddetti; ücret otomatik iade edildi."
            : undefined,
        });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      // Yalnızca halen PROCESSING ise sipariş oluşturma tamamlanmamıştır; rezervi bir kez iade et.
      await db.$transaction(async (tx) => {
        const failed = await tx.scheduledOrder.updateMany({
          where: { id: scheduled.id, status: "PROCESSING" },
          data: { status: "FAILED", nextRunAt: null, updatedAt: new Date() },
        });
        if (failed.count === 1 && scheduled.charge > 0) {
          await applyUserMoneyDelta(tx, scheduled.userId, { balance: scheduled.charge });
        }
      }).catch(() => {});
      results.push({ id: scheduled.id, ok: false, error: msg });
    }
  }

  return NextResponse.json({
    processed: dueOrders.length,
    results,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
