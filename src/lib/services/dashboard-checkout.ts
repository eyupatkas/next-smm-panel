import { PaymentStatus, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { calculateSafeServiceCharge } from "@/lib/pricing";
import { cleanOrderLink } from "@/lib/services/order-link";
import { sendOrderToProvider } from "@/lib/services/provider-order-sync";
import { applyUserMoneyDelta, type MoneyClient } from "@/lib/money";
import { getVatRate } from "@/lib/settings";

const DASHBOARD_PAYTR_METHODS = ["DASHBOARD_ORDER_PAYTR", "DASHBOARD_MASS_PAYTR"] as const;

export type DashboardPaymentMeta = {
  kind: "single" | "mass";
  /** v1 (legacy): pre-created order IDs. v2: empty array — orders created on callback. */
  orderIds: string[];
  /** v2 order creation data (present when orderIds is empty) */
  serviceId?: string;
  quantity?: number;
  links?: string[];
  comments?: string;
  chargePerOrder?: number;
  appliedBalance: number;
  totalCharge: number;
  paytrAmount?: number;
  paymentCurrency?: string;
  gatewayAmount?: number;
  displayCurrency?: string;
  minimumPaymentApplied?: boolean;
  minimumPaymentSurplus?: number;
  linkCount: number;
  placedByAgent?: boolean;
};

type OrderPreview = {
  ok: boolean;
  url: string;
  orderId?: string;
  error?: string;
  paymentRequired?: boolean;
};

type CheckoutUser = {
  id: string;
  role: Role;
  balance: number;
  spent: number;
  email: string | null;
  name: string | null;
  phone: string | null;
  banned: boolean;
  level: number;
};

type CheckoutService = {
  id: string;
  name: string;
  serviceType: string | null;
  min: number;
  max: number;
  price: number;
  retailPrice: number | null;
  resellerPrice: number | null;
  externalId: string | null;
  provider: {
    id: string;
    name: string;
    apiUrl: string;
    apiKey: string;
    status: boolean;
    retailMarkupPercent: number;
    resellerMarkupPercent: number;
  } | null;
  category: {
    name: string;
    parent: { name: string } | null;
  };
};

export type DashboardCheckoutPayload = {
  mode: "single" | "mass";
  serviceId: string;
  quantity: number;
  link?: string;
  links?: string[];
};

export type DashboardCheckoutResult =
  | {
      status: "created";
      message: string;
      totalAmount: number;
      usedBalance: number;
      remainingAmount: number;
      orderIds: string[];
      results?: OrderPreview[];
    }
  | {
      status: "payment_required";
      message: string;
      totalAmount: number;
      usedBalance: number;
      remainingAmount: number;
      orderIds: string[];
      results?: OrderPreview[];
      paymentId: string;
    };

export function encodeDashboardPaymentMeta(meta: DashboardPaymentMeta) {
  return JSON.stringify(meta);
}

export function parseDashboardPaymentMeta(value: string | null | undefined): DashboardPaymentMeta | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<DashboardPaymentMeta>;
    if (
      (parsed.kind === "single" || parsed.kind === "mass") &&
      Array.isArray(parsed.orderIds) &&
      typeof parsed.appliedBalance === "number" &&
      typeof parsed.totalCharge === "number" &&
      typeof parsed.linkCount === "number"
    ) {
      return {
        kind: parsed.kind,
        orderIds: parsed.orderIds.filter((item): item is string => typeof item === "string"),
        // v2 fields (optional)
        serviceId: typeof parsed.serviceId === "string" ? parsed.serviceId : undefined,
        quantity: typeof parsed.quantity === "number" ? parsed.quantity : undefined,
        links: Array.isArray(parsed.links) ? parsed.links.filter((l): l is string => typeof l === "string") : undefined,
        comments: typeof parsed.comments === "string" ? parsed.comments : undefined,
        chargePerOrder: typeof parsed.chargePerOrder === "number" ? parsed.chargePerOrder : undefined,
        appliedBalance: Number(parsed.appliedBalance.toFixed(4)),
        totalCharge: Number(parsed.totalCharge.toFixed(4)),
        paytrAmount: typeof parsed.paytrAmount === "number" ? Number(parsed.paytrAmount.toFixed(4)) : undefined,
        paymentCurrency: typeof parsed.paymentCurrency === "string" ? parsed.paymentCurrency : undefined,
        gatewayAmount: typeof parsed.gatewayAmount === "number" ? Number(parsed.gatewayAmount.toFixed(4)) : undefined,
        displayCurrency: typeof parsed.displayCurrency === "string" ? parsed.displayCurrency : undefined,
        minimumPaymentApplied: parsed.minimumPaymentApplied === true,
        minimumPaymentSurplus: typeof parsed.minimumPaymentSurplus === "number" ? Number(parsed.minimumPaymentSurplus.toFixed(4)) : undefined,
        linkCount: parsed.linkCount,
        placedByAgent: parsed.placedByAgent === true,
      };
    }
  } catch {
    return null;
  }

  return null;
}

// Bekleyen gateway ödemeleri bu süreden eskiyse rezerv dışı bırakılır;
// böylece terk edilmiş ödemeler bakiyeyi sonsuza kadar kilitlemez.
const PENDING_PAYMENT_RESERVATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Kullanıcının bekleyen dashboard ödemeleri (appliedBalance) için ayrılmış tutarı döner.
 * tx verilirse işlem istemcisi üzerinden okur; doğrudan bakiye harcayan tüm akışlar
 * guard'larında bu rezervi hesaba katmalıdır, aksi hâlde ödeme callback'i bakiyeyi
 * negatife düşürebilir.
 */
export async function getReservedDashboardBalance(client: MoneyClient, userId: string) {
  const pendingPayments = await client.payment.findMany({
    where: {
      userId,
      status: PaymentStatus.PENDING,
      method: { in: [...DASHBOARD_PAYTR_METHODS] },
      createdAt: { gte: new Date(Date.now() - PENDING_PAYMENT_RESERVATION_TTL_MS) },
    },
    select: { externalId: true },
  });

  return Number(
    pendingPayments
      .reduce((sum, payment) => sum + (parseDashboardPaymentMeta(payment.externalId)?.appliedBalance ?? 0), 0)
      .toFixed(4),
  );
}

/** Kilitlenmiş bakiyeden rezerv düşülmüş kullanılabilir tutarı döner. */
export async function getEffectiveAvailableBalance(client: MoneyClient, userId: string, lockedBalance: number) {
  const reserved = await getReservedDashboardBalance(client, userId);
  return Number(Math.max(lockedBalance - reserved, 0).toFixed(4));
}

export async function getCheckoutUser(userId: string): Promise<CheckoutUser | null> {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      balance: true,
      spent: true,
      email: true,
      name: true,
      phone: true,
      banned: true,
      level: true,
    },
  });
}

export async function getCheckoutService(serviceId: string): Promise<CheckoutService | null> {
  return db.service.findFirst({
    where: { id: serviceId, status: true },
    select: {
      id: true,
      name: true,
      serviceType: true,
      min: true,
      max: true,
      price: true,
      retailPrice: true,
      resellerPrice: true,
      externalId: true,
      provider: {
        select: {
          id: true,
          name: true,
          apiUrl: true,
          apiKey: true,
          status: true,
          retailMarkupPercent: true,
          resellerMarkupPercent: true,
        },
      },
      category: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
    },
  });
}

/**
 * Cleans a social-media link before it is forwarded to a provider API.
 * - Strips mobile tracking parameters (?si=, ?utm_*, ?fbclid, etc.)
 * - Converts youtu.be short-links to full youtube.com/watch?v= URLs
 */
export function cleanLink(link: string): string {
  return cleanOrderLink(link);
}

export function normalizeLinks(mode: DashboardCheckoutPayload["mode"], link?: string, links?: string[]) {
  if (mode === "single") {
    const singleLink = cleanLink(String(link || "").trim());
    return singleLink ? [singleLink] : [];
  }

  return (links || []).map((item) => cleanLink(item.trim())).filter((item) => item.length > 0);
}

export async function createDirectPaidOrders(input: {
  user: CheckoutUser;
  service: CheckoutService;
  quantity: number;
  links: string[];
  comments?: string;
  placedByAgent?: boolean;
}) {
  const results: OrderPreview[] = [];
  const pricing = calculateSafeServiceCharge(input.user.role, input.service, input.quantity, input.user.level, await getVatRate());
  const unitPrice = pricing.unitPrice;
  const chargePerOrder = pricing.charge;

  const totalRequiredCharge = chargePerOrder * input.links.length;
  if (input.user.balance < totalRequiredCharge) {
    return {
      unitPrice,
      chargePerOrder,
      results: input.links.map(link => ({
        ok: false,
        url: link,
        error: "Yetersiz bakiye",
      } as OrderPreview)),
    };
  }

  for (const link of input.links) {
    try {
      // 1. ADIM: Siparişi veritabanında oluştur ve bakiyeyi düş (Atomik)
      const order = await db.$transaction(async (tx) => {
        const freshUserResult = await tx.$queryRaw<{balance: number}[]>`SELECT balance FROM "User" WHERE id = ${input.user.id} FOR UPDATE`;
        const freshUser = freshUserResult[0];

        if (!freshUser || freshUser.balance < chargePerOrder) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const created = await tx.order.create({
          data: {
            userId: input.user.id,
            serviceId: input.service.id,
            link,
            quantity: input.quantity,
            charge: chargePerOrder,
            status: "PENDING",
            apiOrderId: null,
            remains: input.quantity,
            providerStatus: null,
            providerRawStatus: null,
            providerSentAt: null,
            providerSyncError: null,
            error: null,
            customComments: input.comments ?? null,
            awaitingManualComments: false,
            placedByAgent: input.placedByAgent ?? false,
          },
          select: { id: true },
        });

        await applyUserMoneyDelta(tx, input.user.id, {
          balance: -chargePerOrder,
          spent: chargePerOrder,
        });

        return created;
      });

        // 2. ADIM: Transaksiyondan SONRA tek, idempotent merkezden sağlayıcıya gönder.
        if (input.service.provider?.status && input.service.externalId) {
          await sendOrderToProvider(order.id);
        } else if (input.comments) {
          await db.order.update({
            where: { id: order.id },
            data: {
              providerSyncError: "Sağlayıcı bağlantısı bulunamadı; yorumlar manuel iletim bekliyor.",
              awaitingManualComments: true,
            },
          });
        }

      results.push({ ok: true, url: link, orderId: order.id } as OrderPreview);
    } catch (error) {
      results.push({
        ok: false,
        url: link,
        error: error instanceof Error && error.message === "INSUFFICIENT_BALANCE" ? "Yetersiz bakiye" : (error instanceof Error ? error.message : "Bilinmeyen hata"),
      } as OrderPreview);
    }
  }

  return {
    unitPrice,
    chargePerOrder,
    results,
  };
}

export async function createAwaitingPaymentOrders(input: {
  userId: string;
  serviceId: string;
  quantity: number;
  links: string[];
  chargePerOrder: number;
}) {
  return db.$transaction(async (tx) => {
    const createdOrders: Array<{ id: string; link: string }> = [];

    for (const link of input.links) {
      const order = await tx.order.create({
        data: {
          userId: input.userId,
          serviceId: input.serviceId,
          link,
          quantity: input.quantity,
          charge: input.chargePerOrder,
          status: "PENDING",
          remains: input.quantity,
          error: "awaiting_payment",
        },
        select: { id: true, link: true },
      });

      createdOrders.push(order);
    }

    return createdOrders;
  });
}
