import { describe, expect, it } from "vitest";

import {
  calculatePackageSalesPrices,
  getProviderProfitPolicy,
  roundUpPsychologicalPrice,
} from "./profit-pricing-policy";

describe("profit pricing policy", () => {
  it("keeps TRY providers competitive while preserving strong gross margin", () => {
    expect(getProviderProfitPolicy("TRY")).toEqual({
      retailMarkupPercent: 180,
      resellerMarkupPercent: 90,
    });
  });

  it("adds an FX buffer for foreign-currency providers", () => {
    expect(getProviderProfitPolicy("USD")).toEqual({
      retailMarkupPercent: 220,
      resellerMarkupPercent: 110,
    });
  });

  it("rounds upward to sales-friendly price endings", () => {
    expect(roundUpPsychologicalPrice(10.2)).toBe(10.9);
    expect(roundUpPsychologicalPrice(24.9)).toBe(24.9);
    expect(roundUpPsychologicalPrice(25)).toBe(29.9);
    expect(roundUpPsychologicalPrice(101)).toBe(109.9);
  });

  it("protects both percentage margin and minimum absolute profit", () => {
    expect(calculatePackageSalesPrices(1)).toMatchObject({
      retailPrice: 10.9,
      resellerPrice: 5.9,
    });

    const highCost = calculatePackageSalesPrices(100);
    expect(highCost).not.toBeNull();
    expect(highCost!.retailPrice).toBe(249.9);
    expect(highCost!.resellerPrice).toBe(179.9);
    expect(highCost!.retailProfit).toBeGreaterThan(0);
    expect(highCost!.resellerProfit).toBeGreaterThan(0);
  });
});
