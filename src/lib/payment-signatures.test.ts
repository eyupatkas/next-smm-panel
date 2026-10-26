import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { generateCryptomusSignature, verifyCryptomusSignature } from "./cryptomus";
import { paytrMinorAmount } from "./paytr";
import { verifyPolarWebhook } from "./polar";

describe("paytrMinorAmount", () => {
  it("rounds the same way as token creation for fractional kuruş amounts", () => {
    // 31.395, callback'te Math.round(amount*100) ile 3140'a yuvarlanıyor ama
    // token oluşturma 3139 kuruş istiyor; helper iki tarafı da eşitliyor.
    const amount = 31.395;
    const gatewayAmount = Number(amount.toFixed(2));
    expect(paytrMinorAmount(amount)).toBe(Math.round(gatewayAmount * 100));
    expect(paytrMinorAmount(amount)).toBe(3139);
  });

  it("enforces the 1 kuruş minimum", () => {
    expect(paytrMinorAmount(0)).toBe(1);
    expect(paytrMinorAmount(0.001)).toBe(1);
  });

  it("keeps whole amounts stable", () => {
    expect(paytrMinorAmount(100)).toBe(10000);
    expect(paytrMinorAmount(48.3163)).toBe(4832);
  });
});

describe("payment callback signatures", () => {
  afterEach(() => vi.restoreAllMocks());

  it("accepts only the exact Cryptomus signature", () => {
    const payload = { order_id: "payment-1", status: "paid", uuid: "gateway-1" };
    const signature = generateCryptomusSignature(payload, "secret");
    expect(verifyCryptomusSignature(payload, signature, "secret")).toBe(true);
    expect(verifyCryptomusSignature(payload, `${signature.slice(0, -1)}0`, "secret")).toBe(false);
  });

  it("rejects stale Polar webhooks even when their HMAC is valid", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    const payload = JSON.stringify({ type: "order.paid" });
    const webhookId = "evt_1";
    const oldTimestamp = String(1_800_000_000 - 301);
    const rawSecret = Buffer.from("polar-test-secret").toString("base64");
    const signature = crypto
      .createHmac("sha256", Buffer.from(rawSecret, "base64"))
      .update(`${webhookId}.${oldTimestamp}.${payload}`)
      .digest("base64");

    expect(verifyPolarWebhook(payload, {
      "webhook-id": webhookId,
      "webhook-timestamp": oldTimestamp,
      "webhook-signature": `v1,${signature}`,
    }, `whsec_${rawSecret}`)).toBe(false);
  });

  it("accepts a current Polar webhook with the exact signature", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    const payload = JSON.stringify({ type: "order.paid" });
    const webhookId = "evt_2";
    const timestamp = "1800000000";
    const rawSecret = Buffer.from("polar-test-secret").toString("base64");
    const signature = crypto
      .createHmac("sha256", Buffer.from(rawSecret, "base64"))
      .update(`${webhookId}.${timestamp}.${payload}`)
      .digest("base64");

    expect(verifyPolarWebhook(payload, {
      "webhook-id": webhookId,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
    }, `whsec_${rawSecret}`)).toBe(true);
  });
});
