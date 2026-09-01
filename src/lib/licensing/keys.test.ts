import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deriveLicenseKey, hashLicenseKey, parseLicenseKey } from "./keys";

describe("Driftline license keys", () => {
  it("derives a stable generic key without storing plaintext", () => {
    const first = deriveLicenseKey("MT", "order-item-1234", "test-pepper");
    const retry = deriveLicenseKey("MT", "order-item-1234", "test-pepper");
    expect(first).toBe(retry);
    expect(parseLicenseKey(first)).toMatchObject({ productCode: "MT" });
    expect(hashLicenseKey(first, "test-pepper")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("separates keys by product and issuance identity", () => {
    expect(deriveLicenseKey("MT", "order-item-1234", "test-pepper"))
      .not.toBe(deriveLicenseKey("VS", "order-item-1234", "test-pepper"));
    expect(deriveLicenseKey("MT", "order-item-1234", "test-pepper"))
      .not.toBe(deriveLicenseKey("MT", "order-item-5678", "test-pepper"));
  });

  it("rejects malformed keys", () => {
    expect(parseLicenseKey("MT-plaintext-key")).toBeNull();
  });
});
