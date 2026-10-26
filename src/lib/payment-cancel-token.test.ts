import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createPaymentCancelToken,
  verifyPaymentCancelToken,
} from "./payment-cancel-token";

const originalSecret = process.env.AUTH_SECRET;

describe("payment cancel token", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-that-is-long-enough";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
  });

  it("accepts a valid token for the bound payment", () => {
    const now = Date.UTC(2026, 6, 30);
    const token = createPaymentCancelToken("payment-1", now);

    expect(verifyPaymentCancelToken("payment-1", token, now)).toBe(true);
    expect(verifyPaymentCancelToken("payment-2", token, now)).toBe(false);
  });

  it("rejects expired and modified tokens", () => {
    const now = Date.UTC(2026, 6, 30);
    const token = createPaymentCancelToken("payment-1", now);

    expect(verifyPaymentCancelToken("payment-1", token, now + 31 * 60_000)).toBe(false);
    expect(verifyPaymentCancelToken("payment-1", `${token}x`, now)).toBe(false);
  });
});
