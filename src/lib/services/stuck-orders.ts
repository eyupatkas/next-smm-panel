/**
 * Askıda (stuck) sipariş mantığının saf yardımcıları.
 * DB veya sağlayıcı API bağımlılığı yoktur — birim testlerde doğrudan kullanılabilir.
 */

export const DEFAULT_STUCK_THRESHOLD_HOURS = 24;
export const DEFAULT_CANCEL_CONFIRM_HOURS = 24;
export const STUCK_ESCALATION_BATCH = 10;

export function parsePositiveHours(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 24 * 30);
}

/**
 * İptal edilen sipariş için teslim edilen miktara göre orantılı iade hesabı.
 * GÜVENLİK: `remains` bazı sağlayıcılarda farklı birimde gelebilir; quantity'ye
 * sınırlanır. İade asla charge'ı aşamaz, teslim edilen kısım iade edilmez.
 */
export function computeOrderCancelRefund(input: {
  charge: number;
  quantity: number;
  remains: number;
  startCount: number;
}): number {
  const { charge, quantity, startCount } = input;
  if (quantity <= 0 || charge <= 0) return 0;

  const clampedRemains = Math.min(Math.max(input.remains, 0), quantity);
  const delivered = startCount > 0 ? Math.max(0, quantity - clampedRemains) : 0;
  const refundRatio = Math.min(1, Math.max(0, 1 - delivered / quantity));
  return Number(Math.min(charge * refundRatio, charge).toFixed(4));
}
