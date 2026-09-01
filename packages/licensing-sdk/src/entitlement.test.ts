import { createHash, generateKeyPairSync, sign } from "node:crypto";

import { describe, expect, it } from "vitest";

import { LicensingError } from "./errors";
import { parseSignedEntitlement, verifySignedEntitlement } from "./entitlement";
import type { SignedEntitlementHeader, SignedEntitlementPayload } from "./types";

const installationId = "f07cdce0-60f3-4549-bfeb-28542e6a44df";
const installationIdHash = createHash("sha256").update(installationId).digest("hex");
const pair = generateKeyPairSync("ed25519");
const publicKeySpki = pair.publicKey.export({ format: "der", type: "spki" }).toString("base64url");

function token(overrides: Partial<SignedEntitlementPayload> = {}) {
  const header: SignedEntitlementHeader = { alg: "EdDSA", kid: "test-key", typ: "DLT+LICENSE" };
  const payload: SignedEntitlementPayload = {
    schemaVersion: 1,
    protocolVersion: 1,
    issuer: "https://driftlinetech.com",
    product: "metatweak",
    edition: "pro",
    licenseId: "250c4f76-0f23-4580-a21a-c4a7ee5ac1d7",
    installationIdHash,
    licenseType: "perpetual",
    features: ["core", "pro"],
    versionEntitlement: { scope: "major", majorVersion: 1 },
    activationLimit: 3,
    issuedAt: "2026-09-01T00:00:00.000Z",
    refreshAfter: "2026-10-01T00:00:00.000Z",
    validUntil: "2026-10-15T00:00:00.000Z",
    entitlementExpiresAt: null,
    ...overrides,
  };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(null, Buffer.from(signingInput), pair.privateKey).toString("base64url");
  return `${signingInput}.${signature}`;
}

describe("signed offline entitlements", () => {
  it("verifies a valid entitlement without contacting the service", async () => {
    const result = await verifySignedEntitlement(token(), {
      publicKeySpki,
      keyId: "test-key",
      productSlug: "metatweak",
      installationId,
      now: new Date("2026-09-15T00:00:00.000Z"),
    });
    expect(result.state).toBe("valid");
    expect(result.payload.features).toEqual(["core", "pro"]);
  });

  it("marks a valid signature as refresh-due during its offline grace period", async () => {
    const result = await verifySignedEntitlement(token(), {
      publicKeySpki,
      keyId: "test-key",
      productSlug: "metatweak",
      installationId,
      now: new Date("2026-10-05T00:00:00.000Z"),
    });
    expect(result.state).toBe("refresh_due");
  });

  it("rejects payload tampering", async () => {
    const parts = token().split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    payload.features.push("unlicensed-feature");
    parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
    await expect(verifySignedEntitlement(parts.join("."), {
      publicKeySpki,
      keyId: "test-key",
      productSlug: "metatweak",
      installationId,
    })).rejects.toMatchObject({ code: "invalid_signature" });
  });

  it("rejects a signature from an untrusted key", async () => {
    const other = generateKeyPairSync("ed25519").publicKey
      .export({ format: "der", type: "spki" }).toString("base64url");
    await expect(verifySignedEntitlement(token(), {
      publicKeySpki: other,
      keyId: "test-key",
      productSlug: "metatweak",
      installationId,
    })).rejects.toMatchObject({ code: "invalid_signature" });
  });

  it("rejects a copied entitlement on another installation", async () => {
    await expect(verifySignedEntitlement(token(), {
      publicKeySpki,
      keyId: "test-key",
      productSlug: "metatweak",
      installationId: "ae2e0619-fc32-42ee-9c01-47244346222b",
    })).rejects.toMatchObject({ code: "tampered_entitlement" });
  });

  it("rejects expired offline grants and malformed signed payloads", async () => {
    await expect(verifySignedEntitlement(token(), {
      publicKeySpki,
      keyId: "test-key",
      productSlug: "metatweak",
      installationId,
      now: new Date("2026-10-16T00:00:00.000Z"),
    })).rejects.toMatchObject({ code: "offline_entitlement_expired" });
    expect(() => parseSignedEntitlement("not.a.valid-entitlement"))
      .toThrowError(LicensingError);
    expect(() => parseSignedEntitlement(token({ validUntil: "not-a-date" })))
      .toThrowError(LicensingError);
  });
});
