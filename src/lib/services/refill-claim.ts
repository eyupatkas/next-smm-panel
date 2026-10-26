import { db } from "@/lib/db";

const REFILL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function claimOrderRefill(orderId: string, userId: string, now = new Date()) {
  const cutoff = new Date(now.getTime() - REFILL_COOLDOWN_MS);
  const claimed = await db.order.updateMany({
    where: {
      id: orderId,
      userId,
      status: { in: ["COMPLETED", "PARTIAL"] },
      OR: [{ lastRefillAt: null }, { lastRefillAt: { lte: cutoff } }],
    },
    data: { lastRefillAt: now },
  });
  return claimed.count === 1;
}

export async function releaseOrderRefillClaim(
  orderId: string,
  userId: string,
  claimedAt: Date,
  previousLastRefillAt: Date | null,
) {
  await db.order.updateMany({
    where: { id: orderId, userId, lastRefillAt: claimedAt },
    data: { lastRefillAt: previousLastRefillAt },
  });
}

export function refillCooldownHoursLeft(lastRefillAt: Date | null, now = new Date()) {
  if (!lastRefillAt) return 0;
  return Math.max(0, Math.ceil((REFILL_COOLDOWN_MS - (now.getTime() - lastRefillAt.getTime())) / 3_600_000));
}
