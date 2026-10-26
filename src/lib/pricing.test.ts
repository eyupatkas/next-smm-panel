import { describe, it, expect } from "vitest";
import { getPricingMode, getUnitPriceByRole, calculateSafeServiceCharge } from "./pricing";
import { Role } from "@prisma/client";

describe("Pricing Library Tests", () => {
  describe("getPricingMode", () => {
    it("should return PER_UNIT for packages", () => {
      const mode = getPricingMode({ serviceType: "instagram_package", min: 1, max: 1000 });
      expect(mode).toBe("PER_UNIT");
    });

    it("should return PER_UNIT for min=1 and max=1", () => {
      const mode = getPricingMode({ serviceType: "default", min: 1, max: 1 });
      expect(mode).toBe("PER_UNIT");
    });

    it("should return PER_THOUSAND for normal services", () => {
      const mode = getPricingMode({ serviceType: "default", min: 100, max: 10000 });
      expect(mode).toBe("PER_THOUSAND");
    });
  });

  describe("getUnitPriceByRole", () => {
    const mockService = {
      price: 10.0, // provider price
      retailPrice: 15.0,
      resellerPrice: 12.0,
      min: 100,
      max: 10000,
      serviceType: "default",
      provider: {
        retailMarkupPercent: 10,  // %10 markup → 11.0 minimum floor
        resellerMarkupPercent: 5,  // %5 markup → 10.5 minimum floor
      }
    };

    it("should return retail price for USER role if higher than provider floor", () => {
      const price = getUnitPriceByRole(Role.USER, mockService);
      expect(price).toBe(15.0);
    });

    it("should return reseller price for RESELLER role if higher than provider floor", () => {
      const price = getUnitPriceByRole(Role.RESELLER, mockService);
      expect(price).toBe(12.0);
    });

    it("should floor the price to provider price + markup if role price is lower", () => {
      const lowPriceService = {
        ...mockService,
        retailPrice: 9.0, // Maliyetin altında kalan hatalı fiyat
      };
      // 10.0 * 1.10 = 11.0 minimum olmalı
      const price = getUnitPriceByRole(Role.USER, lowPriceService);
      expect(price).toBe(11.0);
    });
  });

  describe("calculateSafeServiceCharge", () => {
    const mockService = {
      price: 5.0, // provider price
      retailPrice: 10.0,
      resellerPrice: 8.0,
      min: 100,
      max: 10000,
      serviceType: "default",
      provider: null
    };

    it("should calculate correct charge without discount", () => {
      const result = calculateSafeServiceCharge(Role.USER, mockService, 2000);
      // unitPrice = 10.0. Qty = 2000. Mode = PER_THOUSAND. Charge = (10/1000)*2000 = 20.0
      expect(result.charge).toBe(20.0);
      expect(result.providerCost).toBe(10.0); // (5/1000)*2000 = 10.0
    });

    it("should apply level discount correctly but protect provider cost", () => {
      // Level 1 indirimi getLevelDiscountPercent(1) = %5 ise (varsayalım)
      // Biz doğrudan taban maliyet korumasını aşırı indirimli bir durumla test edelim
      const expensiveService = {
        price: 9.0, // Maliyet yüksek
        retailPrice: 10.0, // Satış fiyatı maliyete yakın
        resellerPrice: 8.0,
      };

      // Seviye indirimi uygulandığında fiyat 9.0'un (maliyetin) altına inmemelidir.
      const result = calculateSafeServiceCharge(Role.USER, expensiveService, 1000, 3); // Level 3 ile yüksek indirim
      
      expect(result.charge).toBeGreaterThanOrEqual(result.providerCost);
      expect(result.isBelowProviderCost).toBe(false);
    });
  });
});
