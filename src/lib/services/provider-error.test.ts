import { describe, expect, it } from "vitest";

import { classifyProviderFailure } from "./provider-error";

describe("classifyProviderFailure", () => {
  it.each([
    ["neworder.error.link_duplicate", "CANCEL_AND_REFUND", "CUSTOMER_INPUT"],
    ["neworder.error.username", "CANCEL_AND_REFUND", "CUSTOMER_INPUT"],
    ["Missing username", "CANCEL_AND_REFUND", "CUSTOMER_INPUT"],
    ["neworder.error.min_quantity", "CANCEL_AND_REFUND", "CUSTOMER_INPUT"],
    ["neworder.error.max_quantity", "CANCEL_AND_REFUND", "CUSTOMER_INPUT"],
    ["Invalid link", "CANCEL_AND_REFUND", "CUSTOMER_INPUT"],
    ["neworder.error.not_enough_funds", "RETRY_LATER", "PROVIDER_BALANCE"],
    ["Invalid API key", "RETRY_LATER", "PROVIDER_CONFIG"],
    ["HTTP 503", "RETRY_LATER", "TRANSIENT"],
    ["fetch failed", "MANUAL_REVIEW", "AMBIGUOUS"],
  ])("classifies %s", (error, resolution, category) => {
    const result = classifyProviderFailure(error);
    expect(result.resolution).toBe(resolution);
    expect(result.category).toBe(category);
    expect(result.message.length).toBeGreaterThan(10);
  });

  it("extracts an error code from a raw JSON response", () => {
    const result = classifyProviderFailure(undefined, JSON.stringify({ error: "neworder.error.link_duplicate" }));
    expect(result.code).toBe("neworder.error.link_duplicate");
    expect(result.resolution).toBe("CANCEL_AND_REFUND");
  });

  it("keeps unknown provider errors retryable without exposing them as customer input", () => {
    const result = classifyProviderFailure("provider-specific-code-42");
    expect(result.category).toBe("UNKNOWN");
    expect(result.resolution).toBe("RETRY_LATER");
  });
});
