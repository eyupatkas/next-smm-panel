import { describe, expect, it } from "vitest";

import {
  DEFAULT_CANCEL_CONFIRM_HOURS,
  DEFAULT_STUCK_THRESHOLD_HOURS,
  computeOrderCancelRefund,
  parsePositiveHours,
} from "./stuck-orders";

describe("computeOrderCancelRefund", () => {
  it("refunds the full charge when nothing was delivered", () => {
    expect(
      computeOrderCancelRefund({ charge: 50, quantity: 1000, remains: 1000, startCount: 0 })
    ).toBe(50);
  });

  it("refunds proportionally for the undelivered part", () => {
    // 1000 adetin 600'ü teslim edilmiş → %40 iade
    expect(
      computeOrderCancelRefund({ charge: 50, quantity: 1000, remains: 400, startCount: 50 })
    ).toBe(20);
  });

  it("refunds nothing when everything was delivered", () => {
    expect(
      computeOrderCancelRefund({ charge: 50, quantity: 1000, remains: 0, startCount: 50 })
    ).toBe(0);
  });

  it("clamps provider remains that exceed the local quantity (different unit)", () => {
    // remains=200 > quantity=1 → clamp ile 1'e indirilir; hiç teslim olmadığı için
    // tam iade döner ama iade asla charge'ı aşamaz.
    expect(
      computeOrderCancelRefund({ charge: 30, quantity: 1, remains: 200, startCount: 0 })
    ).toBe(30);
  });

  it("handles zero charge and zero quantity safely", () => {
    expect(computeOrderCancelRefund({ charge: 0, quantity: 100, remains: 100, startCount: 0 })).toBe(0);
    expect(computeOrderCancelRefund({ charge: 100, quantity: 0, remains: 0, startCount: 0 })).toBe(0);
  });
});

describe("parsePositiveHours", () => {
  it("falls back to defaults for missing or invalid values", () => {
    expect(parsePositiveHours(undefined, DEFAULT_STUCK_THRESHOLD_HOURS)).toBe(DEFAULT_STUCK_THRESHOLD_HOURS);
    expect(parsePositiveHours("", DEFAULT_CANCEL_CONFIRM_HOURS)).toBe(DEFAULT_CANCEL_CONFIRM_HOURS);
    expect(parsePositiveHours("-5", 24)).toBe(24);
    expect(parsePositiveHours("abc", 24)).toBe(24);
  });

  it("accepts valid values and caps extreme ones", () => {
    expect(parsePositiveHours("48", 24)).toBe(48);
    expect(parsePositiveHours("99999", 24)).toBe(24 * 30);
  });
});
