import { describe, expect, it } from "vitest";

import { activationSchema, validationSchema } from "@/lib/api/schemas";

const request = {
  protocolVersion: 1,
  productSlug: "metatweak",
  licenseKey: "DL-MT-ABCD-EFGH-JKLM-NPQR-STUV",
  installationId: "3d251c67-5efd-4c19-b3fb-72a240b3ddbf",
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

  it("rejects malformed product slugs and installation identifiers", () => {
    expect(activationSchema.safeParse({ ...request, productSlug: "../admin" }).success).toBe(false);
    expect(activationSchema.safeParse({ ...request, installationId: "raw-hardware-serial" }).success).toBe(false);
  });

  it("requires a separate activation token for validation", () => {
    expect(validationSchema.safeParse(request).success).toBe(false);
    expect(validationSchema.safeParse({
      ...request,
      licenseKey: undefined,
      licenseId: "b0242ba0-1afc-4a83-a489-856f47989381",
      activationToken: "a".repeat(48),
    }).success).toBe(true);
  });
});
