import { describe, expect, it } from "vitest";

import { activationSchema, validationSchema } from "@/lib/api/schemas";

const request = {
  productSlug: "ezebay-listing-manager",
  licenseKey: "DLT-EXAMPLE-KEY-123456789",
  deviceFingerprint: "device-fingerprint-at-least-16",
  deviceName: "Office PC",
  platform: "windows",
  appVersion: "1.0.0",
  nonce: "8b66a270-61da-4e51-9f0c-2f65bde2337e",
  timestamp: "2026-08-30T06:00:00.000Z",
};

describe("license request validation", () => {
  it("accepts a well-formed activation request", () => {
    expect(activationSchema.safeParse(request).success).toBe(true);
  });

  it("rejects malformed product slugs and weak fingerprints", () => {
    expect(activationSchema.safeParse({ ...request, productSlug: "../admin" }).success).toBe(false);
    expect(activationSchema.safeParse({ ...request, deviceFingerprint: "short" }).success).toBe(false);
  });

  it("requires a separate activation token for validation", () => {
    expect(validationSchema.safeParse(request).success).toBe(false);
    expect(validationSchema.safeParse({ ...request, activationToken: "a".repeat(48) }).success).toBe(true);
  });
});
