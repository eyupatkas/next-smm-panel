export type OrderForEta = {
  quantity: number;
  remains: number;
  status: string;
  createdAt: Date | string;
  providerSentAt?: Date | string | null;
  providerLastCheckedAt?: Date | string | null;
  startCount?: number;
};

export type EtaResult = {
  /** Sipariş işlemi başladı mı? (Delivered > 0) */
  hasStarted: boolean;
  /** Teslim edilen miktar */
  delivered: number;
  /** İlerleme yüzdesi [0 - 100] */
  progressPercent: number;
  /** Tahmini kalan süre (milisaniye). Hesaplanamıyorsa null */
  estimatedRemainingMs: number | null;
  /** İnsan tarafından okunabilir tahmini tamamlanma süresi */
  formattedEta: string | null;
  /** Teslimat hızı metni */
  speedText: string | null;
};

/**
 * Siparişin anlık teslimat hızına dayanarak Tahmini Tamamlanma Süresini (ETA) hesaplar.
 * Eğer sipariş henüz başlamadıysa (delivered <= 0 veya PENDING) "0" kabul edilir ve ETA hesaplanmaz.
 */
export function calculateOrderEta(
  order: OrderForEta,
  locale: string = "tr"
): EtaResult {
  const quantity = Math.max(0, Number(order.quantity || 0));
  const rawRemains = Math.max(0, Number(order.remains ?? quantity));
  const status = String(order.status || "").toUpperCase();

  // İptal veya İade durumlarında süre gösterilmez
  if (status === "CANCELED" || status === "REFUNDED") {
    return {
      hasStarted: false,
      delivered: 0,
      progressPercent: 0,
      estimatedRemainingMs: null,
      formattedEta: null,
      speedText: null,
    };
  }

  // Tamamlandı durumu
  if (status === "COMPLETED" || (quantity > 0 && rawRemains <= 0)) {
    return {
      hasStarted: true,
      delivered: quantity,
      progressPercent: 100,
      estimatedRemainingMs: 0,
      formattedEta: locale === "en" ? "Completed" : "Tamamlandı",
      speedText: null,
    };
  }

  const remains = Math.min(quantity, rawRemains);
  const delivered = Math.max(0, quantity - remains);
  const progressPercent =
    quantity > 0 ? Math.min(100, Math.max(0, Math.round((delivered / quantity) * 100))) : 0;

  // RULE: Sipariş henüz başlamadıysa (delivered <= 0 veya PENDING), ETA HESAPLANMASIN!
  if (delivered <= 0 || remains >= quantity || status === "PENDING") {
    return {
      hasStarted: false,
      delivered: 0,
      progressPercent: 0,
      estimatedRemainingMs: null,
      formattedEta: null,
      speedText: null,
    };
  }

  // Sipariş başladı ve teslimat devam ediyor
  const rawStartTime = order.providerSentAt || order.createdAt;
  const startTime = new Date(rawStartTime).getTime();
  const now = Date.now();
  const rawElapsedMs = Math.max(0, now - (isNaN(startTime) ? now : startTime));

  // İlk saniyelerde aşırı yüksek sapmaları önlemek için minimum 30 saniye taban süre
  const effectiveElapsedMs = Math.max(rawElapsedMs, 30_000);

  const deliveryRatePerMs = delivered / effectiveElapsedMs;
  if (deliveryRatePerMs <= 0) {
    return {
      hasStarted: true,
      delivered,
      progressPercent,
      estimatedRemainingMs: null,
      formattedEta: null,
      speedText: null,
    };
  }

  const remainingMs = remains / deliveryRatePerMs;

  // İnsan tarafından okunabilir süre formatlama
  const formattedEta = formatRemainingTime(remainingMs, locale);

  // Teslimat hızı formatlama
  const speedText = formatSpeedText(deliveryRatePerMs, locale);

  return {
    hasStarted: true,
    delivered,
    progressPercent,
    estimatedRemainingMs: Math.round(remainingMs),
    formattedEta,
    speedText,
  };
}

function formatRemainingTime(remainingMs: number, locale: string): string {
  const totalMins = Math.round(remainingMs / 60_000);
  const isEn = locale === "en";

  if (totalMins <= 1) {
    return isEn ? "~1 minute left" : "Yaklaşık 1 dakika kaldı";
  }

  if (totalMins < 60) {
    return isEn
      ? `~${totalMins} minutes left`
      : `Yaklaşık ${totalMins} dakika kaldı`;
  }

  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  if (hours < 24) {
    if (mins === 0) {
      return isEn ? `~${hours} hours left` : `Yaklaşık ${hours} saat kaldı`;
    }
    return isEn
      ? `~${hours}h ${mins}m left`
      : `Yaklaşık ${hours} sa ${mins} dk kaldı`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (remHours === 0) {
    return isEn ? `~${days} days left` : `Yaklaşık ${days} gün kaldı`;
  }

  return isEn
    ? `~${days}d ${remHours}h left`
    : `Yaklaşık ${days} gün ${remHours} sa kaldı`;
}

function formatSpeedText(ratePerMs: number, locale: string): string {
  const isEn = locale === "en";
  const unitsPerMin = ratePerMs * 60_000;
  const unitsPerHour = ratePerMs * 3_600_000;

  if (unitsPerMin >= 10) {
    const val = Math.round(unitsPerMin).toLocaleString(isEn ? "en-US" : "tr-TR");
    return isEn ? `~${val} units/min` : `Dakikada ~${val} adet`;
  }

  if (unitsPerHour >= 1) {
    const val = Math.round(unitsPerHour).toLocaleString(isEn ? "en-US" : "tr-TR");
    return isEn ? `~${val} units/hour` : `Saatte ~${val} adet`;
  }

  const unitsPerDay = unitsPerHour * 24;
  const val = Math.round(unitsPerDay).toLocaleString(isEn ? "en-US" : "tr-TR");
  return isEn ? `~${val} units/day` : `Günde ~${val} adet`;
}
