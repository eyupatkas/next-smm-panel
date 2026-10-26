import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncOrderWithProvider } from "@/lib/services/provider-order-sync";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { auth } from "@/auth";

const TRACKING_SYNC_MIN_REFRESH_MS = 20_000;

async function findTrackableOrder(id: string) {
  return db.order.findFirst({
    where: {
      OR: [
        { id: id },
        { id: { endsWith: id.toUpperCase() } },
        { id: { endsWith: id.toLowerCase() } },
      ],
    },
    select: {
      id: true,
      status: true,
      charge: true,
      quantity: true,
      startCount: true,
      remains: true,
      link: true,
      createdAt: true,
      updatedAt: true,
      error: true,
      serviceId: true,
      apiOrderId: true,
      providerLastCheckedAt: true,
      service: { select: { name: true } },
      user: { select: { email: true } },
    },
  });
}

export async function GET(request: NextRequest) {
  // Rate limit: her IP'den 60 saniyede 20 istek
  const ip = getClientIp(request);
  if (rateLimit(`order-tracking:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  const paymentId = searchParams.get("paymentId")?.trim();
  const email = searchParams.get("email")?.trim().toLowerCase();

  // ── paymentId ile arama (RETAIL_V2 akışı) ──
  if (paymentId) {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, externalId: true, method: true },
    });

    if (!payment || payment.method !== "RETAIL_PAYTR") {
      return NextResponse.json({ error: "Ödeme bulunamadı." }, { status: 404 });
    }

    const extId = payment.externalId ?? "";

    // Ödeme başarısız — açıkça bildir (kimse sonsuz "işleniyor" ekranında beklemesin)
    if (payment.status === "FAILED") {
      return NextResponse.json({
        paymentStatus: "FAILED",
        failed: true,
        message: "Bu ödeme tamamlanamadı. Ödemeniz kartınızdan tahsil edilmemiş olabilir.",
      });
    }

    // Callback henüz çalışmadı (ödeme işleniyor)
    if (extId.startsWith("RETAIL_V2:") || payment.status === "PENDING") {
      return NextResponse.json({
        paymentStatus: payment.status,
        awaiting: true,
        message: "Ödeme işleniyor, sipariş kısa süre içinde oluşturulacak.",
      });
    }

    // Callback tamamlandı — order ID'lerini bul
    const isComboExt = extId.startsWith("COMBO:");
    const orderIds = isComboExt
      ? extId.slice(6).split(",").filter(Boolean)
      : extId ? [extId] : [];

    if (orderIds.length === 0) {
      return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    }

    const orders = await db.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        status: true,
        charge: true,
        quantity: true,
        startCount: true,
        remains: true,
        link: true,
        createdAt: true,
        updatedAt: true,
        error: true,
        serviceId: true,
        service: { select: { name: true } },
      },
    });

    if (orders.length === 0) {
      return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    }

    if (orders.length === 1) {
      const o = orders[0];
      const pkg = await db.package.findFirst({
        where: { serviceId: o.serviceId, quantity: o.quantity, status: true },
        select: { name: true },
      });
      return NextResponse.json({
        id: o.id,
        shortId: o.id.slice(-8).toUpperCase(),
        status: o.status,
        serviceName: o.service.name,
        packageName: pkg?.name ?? o.service.name,
        charge: o.charge,
        quantity: o.quantity,
        startCount: o.startCount,
        remains: o.remains,
        link: o.link,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        hasError: Boolean(o.error),
      });
    }

    // Combo
    return NextResponse.json({
      combo: true,
      orders: orders.map((o) => ({
        id: o.id,
        shortId: o.id.slice(-8).toUpperCase(),
        status: o.status,
        serviceName: o.service.name,
        quantity: o.quantity,
        remains: o.remains,
        hasError: Boolean(o.error),
      })),
    });
  }

  if (!id || id.length < 8) {
    return NextResponse.json({ error: "Geçerli bir sipariş numarası girin." }, { status: 400 });
  }

  // Sipariş ID'nin son 8 karakteri veya tam ID ile arama
  let order = await findTrackableOrder(id);

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  // Kısa sipariş kodları tahmin edilebilir; sahiplik kanıtı olmadan detay döndürme.
  const session = await auth();
  const ownsOrder = session?.user?.id
    ? Boolean(await db.order.findFirst({ where: { id: order.id, userId: session.user.id }, select: { id: true } }))
    : false;
  if (!ownsOrder && (!email || !order.user.email || order.user.email.toLowerCase() !== email)) {
    return NextResponse.json({ error: "E-posta adresi sipariş ile eşleşmiyor." }, { status: 403 });
  }

  const awaitingPayment = order.error === "awaiting_payment";
  const shouldLiveSync =
    !awaitingPayment &&
    ["PENDING", "PROCESSING"].includes(order.status) &&
    (!order.providerLastCheckedAt ||
      Date.now() - new Date(order.providerLastCheckedAt).getTime() >= TRACKING_SYNC_MIN_REFRESH_MS);

  if (shouldLiveSync) {
    try {
      await syncOrderWithProvider(order.id);
      const freshOrder = await findTrackableOrder(order.id);
      if (freshOrder) {
        order = freshOrder;
      }
    } catch {
      // Sync hatasi response'u bozmasin.
    }
  }

  // Paket adını servise bağlı paketlerden bul (quantity eşleşmesi)
  const pkg = await db.package.findFirst({
    where: { serviceId: order.serviceId, quantity: order.quantity, status: true },
    select: { name: true },
  });

  // awaiting_payment durumu — ödeme henüz onaylanmadı
  const isAwaitingPayment = order.error === "awaiting_payment";

  return NextResponse.json({
    id: order.id,
    shortId: order.id.slice(-8).toUpperCase(),
    status: isAwaitingPayment ? "AWAITING_PAYMENT" : order.status,
    serviceName: order.service.name,
    packageName: pkg?.name ?? order.service.name,
    charge: order.charge,
    quantity: order.quantity,
    startCount: order.startCount,
    remains: order.remains,
    link: order.link,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    hasError: Boolean(order.error && order.error !== "awaiting_payment"),
  });
}
