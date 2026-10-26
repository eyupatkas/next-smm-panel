import { PAYTR_MINIMUM_PAYMENT_TL } from "@/lib/payment-minimums";

export { PAYTR_MINIMUM_PAYMENT_TL };

export type PayTRMinimumResolution = {
  originalAmount: number;
  payableAmount: number;
  applied: boolean;
  surplusAmount: number;
};

function money(value: number) {
  return Number(value.toFixed(4));
}

export function resolvePayTRMinimum(amount: number): PayTRMinimumResolution {
  const originalAmount = money(Math.max(Number.isFinite(amount) ? amount : 0, 0));
  const applied = originalAmount > 0 && originalAmount < PAYTR_MINIMUM_PAYMENT_TL;
  const payableAmount = applied ? PAYTR_MINIMUM_PAYMENT_TL : originalAmount;

  return {
    originalAmount,
    payableAmount,
    applied,
    surplusAmount: money(Math.max(payableAmount - originalAmount, 0)),
  };
}