import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateSafeServiceCharge, getUnitPriceByRole } from "@/lib/pricing";
import { cancelProviderOrders, createProviderRefill, getProviderRefillStatus } from "@/lib/api/provider-client";
import { Role, RefillRequestStatus } from "@prisma/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { cleanLink } from "@/lib/services/dashboard-checkout";
import { sendOrderToProvider } from "@/lib/services/provider-order-sync";
import { claimOrderRefill, refillCooldownHoursLeft, releaseOrderRefillClaim } from "@/lib/services/refill-claim";
import { applyUserMoneyDelta } from "@/lib/money";
import { getEffectiveAvailableBalance } from "@/lib/services/dashboard-checkout";
import { getVatRate } from "@/lib/settings";

/**
 * Standard SMM Panel API v2
 * Single POST endpoint — dispatches by `action` parameter.
 *
 * Actions: services, balance, add (order), status
 */

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function errorJson(message: string, status = 400) {
  return json({ error: message }, status);
}

// Standard SMM panel status string mapping
function mapStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Pending",
    PROCESSING: "In progress",
    COMPLETED: "Completed",
    PARTIAL: "Partial",
    CANCELED: "Canceled",
    FAILED: "Canceled",
  };
  return map[status] ?? status;
}

async function authenticateByApiKey(key: string) {
  if (!key) return null;
  const user = await db.user.findUnique({
    where: { apiKey: key },
    select: { id: true, role: true, balance: true, email: true, banned: true, level: true },
  });
  // Banlı kullanıcı API'yi kullanamaz
  if (!user || user.banned) return null;
  return user;
}

export async function POST(req: NextRequest) {
  // Rate limit: her IP'den 60 saniyede 60 istek
  const ip = getClientIp(req);
  if (rateLimit(`apiv2:${ip}`, 60, 60_000)) {
    return errorJson("Rate limit exceeded. Try again later.", 429);
  }

  let body: Record<string, string>;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, string>;
    }
  } catch {
    return errorJson("Invalid request body");
  }

  const apiKey = String(body.key || "").trim();
  if (!apiKey) return errorJson("Missing API key");

  const user = await authenticateByApiKey(apiKey);
  if (!user) return errorJson("Invalid API key", 401);

  const action = String(body.action || "").trim().toLowerCase();

  switch (action) {
    case "services":
      return handleServices(user);
    case "balance":
      return handleBalance(user);
    case "add":
      return handleAddOrder(user, body);
    case "status":
      return handleOrderStatus(user, body);
    case "cancel":
      return handleCancelOrders(user, body);
    case "refill":
      return handleRefillOrder(user, body);
    case "refill_status":
      return handleRefillStatus(user, body);
    default:
      return errorJson(`Invalid action: ${action}`);
  }
}

// ─── Services Cache ───────────────────────────────────────────────────

interface CachedService {
  id: string;
  externalId: string | null;
  name: string;
  description: string | null;
  price: number;
  retailPrice: number | null;
  resellerPrice: number | null;
  min: number;
  max: number;
  serviceType: string | null;
  canRefill: boolean;
  canCancel: boolean;
  hasDripfeed: boolean;
  providerId: string | null;
  category: { name: string };
  provider: { retailMarkupPercent: number; resellerMarkupPercent: number } | null;
}

let servicesCache: { data: CachedService[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 dakika önbellek

async function getActiveServicesCached(): Promise<CachedService[]> {
  const now = Date.now();
  if (servicesCache && servicesCache.expiresAt > now) {
    return servicesCache.data;
  }

  const services = await db.service.findMany({
    where: { status: true, category: { status: true } },
    select: {
      id: true,
      externalId: true,
      name: true,
      description: true,
      price: true,
      retailPrice: true,
      resellerPrice: true,
      min: true,
      max: true,
      serviceType: true,
      canRefill: true,
      canCancel: true,
      hasDripfeed: true,
      providerId: true,
      category: { select: { name: true } },
      provider: { select: { retailMarkupPercent: true, resellerMarkupPercent: true } },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  }) as unknown as CachedService[];

  servicesCache = {
    data: services,
    expiresAt: now + CACHE_TTL_MS,
  };

  return services;
}

// ─── Services ─────────────────────────────────────────────────────────

async function handleServices(user: { role: Role }) {
  const services = await getActiveServicesCached();

  const list = services.map((s, idx) => ({
    service: idx + 1,
    name: s.name,
    type: "Default",
    category: s.category.name,
    rate: getUnitPriceByRole(user.role, s).toFixed(4),
    min: String(s.min),
    max: String(s.max),
    refill: s.canRefill,
    cancel: s.canCancel,
    dripfeed: s.hasDripfeed,
  }));

  return json(list);
}

// ─── Balance ──────────────────────────────────────────────────────────

async function handleBalance(user: { balance: number }) {
  return json({
    balance: user.balance.toFixed(4),
    currency: "TRY",
  });
}

// ─── Add Order ────────────────────────────────────────────────────────

async function handleAddOrder(
  user: { id: string; role: Role; balance: number; level: number },
  body: Record<string, string>,
) {
  const serviceIdx = parseInt(body.service || "0", 10);
  const link = cleanLink(String(body.link || "").trim());
  const quantity = parseInt(body.quantity || "0", 10);

  if (!link) return errorJson("Missing link");
  if (!quantity || quantity < 1) return errorJson("Invalid quantity");
  if (!serviceIdx) return errorJson("Missing service");

  // Lookup service by index (API services are 1-indexed)
  const allServices = await getActiveServicesCached();

  const service = allServices[serviceIdx - 1];
  if (!service) return errorJson("Service not found");

  if (quantity < service.min || quantity > service.max) {
    return errorJson(`Quantity must be between ${service.min} and ${service.max}`);
  }

  const pricing = calculateSafeServiceCharge(user.role, service, quantity, user.level, await getVatRate());
  const unitPrice = pricing.unitPrice;
  const charge = pricing.charge;

  if (unitPrice <= 0 || charge <= 0) {
    return errorJson("Service price is not configured. Please contact support.");
  }

  const availableBalance = await getEffectiveAvailableBalance(db, user.id, user.balance);
  if (charge > availableBalance) {
    return errorJson("Insufficient balance");
  }

  // Create order and deduct balance atomically
  let order;
  try {
    order = await db.$transaction(async (tx) => {
      const freshUserResult = await tx.$queryRaw<{balance: number}[]>`SELECT balance FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const freshUser = freshUserResult[0];

      if (!freshUser || (await getEffectiveAvailableBalance(tx, user.id, freshUser.balance)) < charge) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const created = await tx.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          link,
          quantity,
          charge: Number(charge.toFixed(4)),
          status: "PENDING",
          apiOrderId: null,
          remains: quantity,
          providerStatus: null,
          providerRawStatus: null,
          providerSentAt: null,
          providerSyncError: null,
        },
      });

      await applyUserMoneyDelta(tx, user.id, {
        balance: -Number(charge.toFixed(4)),
        spent: Number(charge.toFixed(4)),
      });

      return created;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return errorJson("Insufficient balance");
    }
    throw err;
  }

  if (service.providerId && service.externalId) {
    await sendOrderToProvider(order.id);
  }

  return json({ order: order.id });
}

// ─── Order Status ─────────────────────────────────────────────────────

async function handleOrderStatus(
  user: { id: string },
  body: Record<string, string>,
) {
  // Support single "order" or comma-separated "orders"
  const singleId = String(body.order || "").trim();
  const multiIds = String(body.orders || "").trim();

  if (!singleId && !multiIds) return errorJson("Missing order or orders");

  if (multiIds) {
    const ids = multiIds.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
    const orders = await db.order.findMany({
      where: { id: { in: ids }, userId: user.id },
      select: { id: true, status: true, charge: true, startCount: true, remains: true },
    });
    const byId: Record<string, unknown> = {};
    const found = new Set(orders.map((o) => o.id));
    for (const id of ids) {
      if (found.has(id)) {
        const o = orders.find((x) => x.id === id)!;
        byId[id] = {
          charge: o.charge.toFixed(4),
          start_count: String(o.startCount ?? 0),
          status: mapStatus(o.status),
          remains: String(o.remains ?? 0),
          currency: "TRY",
        };
      } else {
        byId[id] = { error: "Order not found" };
      }
    }
    return json(byId);
  }

  const order = await db.order.findFirst({
    where: { id: singleId, userId: user.id },
    select: { id: true, status: true, charge: true, startCount: true, remains: true, quantity: true },
  });

  if (!order) return errorJson("Order not found");

  return json({
    charge: order.charge.toFixed(4),
    start_count: String(order.startCount ?? 0),
    status: mapStatus(order.status),
    remains: String(order.remains ?? 0),
    currency: "TRY",
  });
}

// ─── Cancel Orders ────────────────────────────────────────────────────

async function handleCancelOrders(
  user: { id: string },
  body: Record<string, string>,
) {
  const rawOrders = String(body.orders || body.order || "").trim();
  if (!rawOrders) return errorJson("Missing orders");

  const ids = rawOrders.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);

  const orders = await db.order.findMany({
    where: { id: { in: ids }, userId: user.id },
    include: {
      service: {
        select: {
          canCancel: true,
          providerId: true,
          provider: { select: { apiUrl: true, apiKey: true } },
        },
      },
    },
  });

  const results: { order: string; cancel: number | { error: string } }[] = [];

  for (const id of ids) {
    const order = orders.find((o) => o.id === id);

    if (!order) { results.push({ order: id, cancel: { error: "Order not found" } }); continue; }
    if (!order.service.canCancel) { results.push({ order: id, cancel: { error: "Service does not support cancel" } }); continue; }
    if (order.cancelledAt) { results.push({ order: id, cancel: { error: "Order already cancelled" } }); continue; }
    if (!["PENDING", "PROCESSING"].includes(order.status)) { results.push({ order: id, cancel: { error: "Order cannot be cancelled in current status" } }); continue; }

    // Call provider if applicable
    if (order.apiOrderId && order.service.provider) {
      try {
        const res = await cancelProviderOrders(order.service.provider.apiUrl, order.service.provider.apiKey, [order.apiOrderId]);
        if (!res.ok && res.failed.length > 0) {
          results.push({ order: id, cancel: { error: "Provider rejection" } });
          continue;
        }
      } catch {
        results.push({ order: id, cancel: { error: "Provider error" } });
        continue;
      }
    }

    // Refund undelivered portion.
    // GÜVENLİK: remains'i quantity'ye, oranı [0,1] aralığına sınırla; iade charge'ı aşamaz.
    const clampedRemains = Math.min(Math.max(order.remains ?? order.quantity ?? 0, 0), order.quantity ?? 0);
    const delivered = (order.quantity ?? 0) - clampedRemains;
    const refundRatio = order.quantity > 0 ? Math.min(1, Math.max(0, 1 - delivered / order.quantity)) : 1;
    const refundedAmount = Number(Math.min(order.charge * refundRatio, order.charge).toFixed(4));

    try {
      await db.$transaction(async (tx) => {
        const canceled = await tx.order.updateMany({
          where: {
            id,
            userId: user.id,
            cancelledAt: null,
            status: { in: ["PENDING", "PROCESSING"] },
          },
          data: { status: "CANCELED", cancelledAt: new Date(), refundedAmount },
        });
        if (canceled.count !== 1) throw new Error("ALREADY_CANCELED_OR_INVALID_STATUS");

        if (refundedAmount > 0) {
          await applyUserMoneyDelta(tx, user.id, {
            balance: refundedAmount,
            spent: -refundedAmount,
          });
        }
      });
      results.push({ order: id, cancel: 1 });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg === "ALREADY_CANCELED_OR_INVALID_STATUS") {
        results.push({ order: id, cancel: { error: "Order already cancelled" } });
      } else {
        results.push({ order: id, cancel: { error: "Cancel transaction failed" } });
      }
    }
  }

  return json(results);
}

// ─── Refill Order ─────────────────────────────────────────────────────

async function handleRefillOrder(
  user: { id: string },
  body: Record<string, string>,
) {
  // Multi-refill: orders param (comma-separated)
  const multiIds = String(body.orders || "").trim();
  if (multiIds) {
    const orderIds = multiIds.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
    const results: { order: string; refill: string | { error: string } }[] = [];

    for (const orderId of orderIds) {
      const order = await db.order.findFirst({
        where: { id: orderId, userId: user.id },
        include: { service: { select: { canRefill: true, provider: { select: { apiUrl: true, apiKey: true } } } } },
      });
      if (!order) { results.push({ order: orderId, refill: { error: "Order not found" } }); continue; }
      if (!order.service.canRefill) { results.push({ order: orderId, refill: { error: "Refill not supported" } }); continue; }
      if (!["COMPLETED", "PARTIAL"].includes(order.status)) { results.push({ order: orderId, refill: { error: "Order not eligible for refill" } }); continue; }
      const hoursLeft = refillCooldownHoursLeft(order.lastRefillAt);
      if (hoursLeft > 0) { results.push({ order: orderId, refill: { error: `Refill cooldown: ${hoursLeft}h` } }); continue; }
      if (!order.apiOrderId || !order.service.provider) { results.push({ order: orderId, refill: { error: "Provider information missing" } }); continue; }
      const claimedAt = new Date();
      if (!(await claimOrderRefill(order.id, user.id, claimedAt))) {
        results.push({ order: orderId, refill: { error: "Refill already requested" } });
        continue;
      }
      let providerAccepted = false;
      try {
        const res = await createProviderRefill(order.service.provider.apiUrl, order.service.provider.apiKey, order.apiOrderId);
        if (!res.ok) {
          await releaseOrderRefillClaim(order.id, user.id, claimedAt, order.lastRefillAt);
          results.push({ order: orderId, refill: { error: res.error || "Provider refill failed" } });
          continue;
        }
        providerAccepted = true;
        
        const refillId = res.refillId ?? "1";
        await db.refillRequest.create({
          data: {
            orderId: order.id,
            userId: user.id,
            status: "SENT",
            providerRefillId: refillId,
          }
        });

        results.push({ order: orderId, refill: refillId });
      } catch {
        if (!providerAccepted) {
          await releaseOrderRefillClaim(order.id, user.id, claimedAt, order.lastRefillAt);
        }
        results.push({ order: orderId, refill: { error: "Provider error" } });
      }
    }
    return json(results);
  }

  // Single refill: order param
  const orderId = String(body.order || "").trim();
  if (!orderId) return errorJson("Missing order or orders");

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: {
      service: {
        select: {
          canRefill: true,
          providerId: true,
          provider: { select: { apiUrl: true, apiKey: true } },
        },
      },
    },
  });

  if (!order) return errorJson("Order not found");
  if (!order.service.canRefill) return errorJson("Service does not support refill");
  if (!["COMPLETED", "PARTIAL"].includes(order.status)) return errorJson("Order not eligible for refill");
  const hoursLeft = refillCooldownHoursLeft(order.lastRefillAt);
  if (hoursLeft > 0) return errorJson(`Refill cooldown: ${hoursLeft}h`);

  if (!order.apiOrderId || !order.service.provider) {
    return errorJson("Provider information missing");
  }

  const claimedAt = new Date();
  if (!(await claimOrderRefill(order.id, user.id, claimedAt))) {
    return errorJson("Refill already requested");
  }

  let providerAccepted = false;
  try {
    const res = await createProviderRefill(order.service.provider.apiUrl, order.service.provider.apiKey, order.apiOrderId);
    if (!res.ok) {
      await releaseOrderRefillClaim(order.id, user.id, claimedAt, order.lastRefillAt);
      return errorJson(res.error || "Provider refill failed", 503);
    }
    providerAccepted = true;
    
    const refillId = res.refillId ?? "1";
    await db.refillRequest.create({
      data: {
        orderId: order.id,
        userId: user.id,
        status: "SENT",
        providerRefillId: refillId,
      }
    });

    return json({ refill: refillId });
  } catch {
    if (!providerAccepted) {
      await releaseOrderRefillClaim(order.id, user.id, claimedAt, order.lastRefillAt);
    }
    return errorJson("Provider error", 503);
  }
}

// ─── Refill Status ────────────────────────────────────────────────────

async function handleRefillStatus(user: { id: string }, body: Record<string, string>) {
  const multi = String(body.refills || "").trim();
  if (multi) {
    const ids = multi.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
    const results = [];

    const refillRequests = await db.refillRequest.findMany({
      where: { userId: user.id, providerRefillId: { in: ids } },
      include: {
        order: {
          include: {
            service: {
              include: {
                provider: true
              }
            }
          }
        }
      }
    });

    for (const id of ids) {
      const req = refillRequests.find((r) => r.providerRefillId === id);
      if (!req) {
        results.push({ refill: id, status: "Failed" });
        continue;
      }

      if (["PENDING", "SENT"].includes(req.status)) {
        const provider = req.order.service.provider;
        if (provider?.status && req.providerRefillId) {
          try {
            const check = await getProviderRefillStatus(provider.apiUrl, provider.apiKey, req.providerRefillId);
            if (check.ok && check.status) {
              let dbStatus: RefillRequestStatus = "SENT";
              const lowerStatus = check.status.toLowerCase();
              if (lowerStatus.includes("complete")) {
                dbStatus = "COMPLETED";
              } else if (lowerStatus.includes("fail") || lowerStatus.includes("error")) {
                dbStatus = "FAILED";
              } else if (lowerStatus.includes("reject")) {
                dbStatus = "REJECTED";
              }

              if (dbStatus !== req.status) {
                await db.refillRequest.update({
                  where: { id: req.id },
                  data: {
                    status: dbStatus,
                    resolvedAt: (dbStatus as string) !== "PENDING" && dbStatus !== "SENT" ? new Date() : undefined
                  }
                });
              }
              results.push({ refill: id, status: check.status });
              continue;
            }
          } catch (err) {
            console.error(`Refill batch status check failed for refill ${id}:`, err);
          }
        }
      }

      const statusMap: Record<string, string> = {
        PENDING: "Pending",
        SENT: "Pending",
        COMPLETED: "Completed",
        REJECTED: "Rejected",
        FAILED: "Failed",
      };
      results.push({ refill: id, status: statusMap[req.status] ?? "Pending" });
    }
    return json(results);
  }

  const refillId = String(body.refill || "").trim();
  if (!refillId) return errorJson("Missing refill or refills");

  const req = await db.refillRequest.findFirst({
    where: { userId: user.id, providerRefillId: refillId },
    include: {
      order: {
        include: {
          service: {
            include: {
              provider: true
            }
          }
        }
      }
    }
  });

  if (!req) return errorJson("Refill not found");

  if (["PENDING", "SENT"].includes(req.status)) {
    const provider = req.order.service.provider;
    if (provider?.status && req.providerRefillId) {
      try {
        const check = await getProviderRefillStatus(provider.apiUrl, provider.apiKey, req.providerRefillId);
        if (check.ok && check.status) {
          let dbStatus: RefillRequestStatus = "SENT";
          const lowerStatus = check.status.toLowerCase();
          if (lowerStatus.includes("complete")) {
            dbStatus = "COMPLETED";
          } else if (lowerStatus.includes("fail") || lowerStatus.includes("error")) {
            dbStatus = "FAILED";
          } else if (lowerStatus.includes("reject")) {
            dbStatus = "REJECTED";
          }

          if (dbStatus !== req.status) {
            await db.refillRequest.update({
              where: { id: req.id },
              data: {
                status: dbStatus,
                resolvedAt: (dbStatus as string) !== "PENDING" && dbStatus !== "SENT" ? new Date() : undefined
              }
            });
          }
          return json({ status: check.status });
        }
      } catch (err) {
        console.error(`Refill status check failed for refill ${refillId}:`, err);
      }
    }
  }

  const statusMap: Record<string, string> = {
    PENDING: "Pending",
    SENT: "Pending",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
    FAILED: "Failed",
  };
  return json({ status: statusMap[req.status] ?? "Pending" });
}
