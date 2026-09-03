import { generateKeyPairSync, randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { decryptLicenseKey, encryptLicenseKey, publicJwkFromPrivateKey, signCompactJws, verifyCompactJws } from "@/lib/licensing/crypto";

describe("licensing cryptography", () => {
  it("signs entitlements that verify with only the public key", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const privateDer = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
    const publicDer = publicKey.export({ format: "der", type: "spki" }).toString("base64");
    const token = signCompactJws({ product_id: "metatweak", features: ["document_metadata"] }, privateDer, "test-key");

    expect(verifyCompactJws(token, publicDer)).toBe(true);
    const [header, , signature] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ product_id: "other" })).toString("base64url");
    expect(verifyCompactJws([header, tamperedPayload, signature].join("."), publicDer)).toBe(false);
    expect(publicJwkFromPrivateKey(privateDer, "test-key")).toMatchObject({ alg: "EdDSA", kid: "test-key", kty: "OKP", use: "sig" });
  });

  it("encrypts recoverable license delivery material with authenticated encryption", () => {
    const key = randomBytes(32).toString("base64");
    const ciphertext = encryptLicenseKey("DLT1_example-license", key);
    expect(ciphertext).not.toContain("example-license");
    expect(decryptLicenseKey(ciphertext, key)).toBe("DLT1_example-license");
    expect(() => decryptLicenseKey(ciphertext.slice(0, -2) + "xx", key)).toThrow();
  });
});
