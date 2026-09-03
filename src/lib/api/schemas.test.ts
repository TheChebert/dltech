import { describe, expect, it } from "vitest";

import { activationSchema, checkoutSchema, validationSchema } from "@/lib/api/schemas";

const request = {
  productId: "metatweak",
  licenseKey: "DLT1_example-key-with-enough-entropy",
  installationId: "8d2bc42e-9d0f-4e78-9192-93e63f43d17c",
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

  it("rejects malformed product and installation identifiers", () => {
    expect(activationSchema.safeParse({ ...request, productId: "../admin" }).success).toBe(false);
    expect(activationSchema.safeParse({ ...request, installationId: "machine-name" }).success).toBe(false);
  });

  it("requires an activation token instead of the raw key for validation", () => {
    expect(validationSchema.safeParse(request).success).toBe(false);
    const proof = {
      productId: request.productId,
      installationId: request.installationId,
      platform: request.platform,
      appVersion: request.appVersion,
      nonce: request.nonce,
      timestamp: request.timestamp,
    };
    expect(validationSchema.safeParse({ ...proof, activationToken: "a".repeat(48) }).success).toBe(true);
  });

  it("allows only stable product and edition IDs at checkout", () => {
    expect(checkoutSchema.safeParse({ productId: "metatweak", editionId: "pro" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ productId: "MetaTweak", editionId: "pro" }).success).toBe(false);
  });
});
