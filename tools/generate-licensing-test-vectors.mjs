import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "contracts/licensing/protocol-v1.test-vectors.json");
const issuer = "https://licensing-nonprod.driftlinetech.com";
const productId = "metatweak";
const installationId = "8b66a270-61da-4e51-9f0c-2f65bde2337e";
const now = 2_000;
const testSeed = Buffer.from("64726966746c696e652d70726f746f636f6c2d76312d7061726974792d746573", "hex");
const privateKey = createPrivateKey({
  key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), testSeed]),
  format: "der",
  type: "pkcs8",
});
const publicKey = createPublicKey(privateKey);
const kid = "shared-parity-vector";

function signed(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "EdDSA", kid, typ: "DLT-ENTITLEMENT+jwt", v: 1 })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(null, Buffer.from(`${header}.${body}`), privateKey).toString("base64url");
  return `${header}.${body}.${signature}`;
}

function payload(overrides = {}) {
  return {
    schema_version: 1,
    iss: issuer,
    aud: productId,
    sub: "shared-license-id",
    jti: "8d2bc42e-9d0f-4e78-9192-93e63f43d17c",
    iat: 1_000,
    refresh_after: 3_000,
    authorization: { kind: "perpetual", expires_at: null },
    product_id: productId,
    edition_id: "pro",
    license_type: "perpetual",
    activation_required: true,
    activation_limit: 3,
    installation_id: installationId,
    activation_id: "bb66a270-61da-4e51-9f0c-2f65bde2337e",
    features: ["advanced_metadata", "batch_editing", "presets"],
    version_entitlement: { policy: "all_versions", current_version: null },
    ...overrides,
  };
}

const validPerpetual = signed(payload());
const [validHeader, validBody, validSignature] = validPerpetual.split(".");
const tamperedBody = validBody.slice(0, -1) + (validBody.endsWith("A") ? "B" : "A");
const invalidSignature = validSignature.slice(0, -1) + (validSignature.endsWith("A") ? "B" : "A");

const vectors = {
  fixture_version: 1,
  protocol: { api_version: "v1", specification_version: "1.1.0", token_schema_version: 1 },
  generated: "Deterministic test-only Ed25519 key material. No production signing material is retained or distributed.",
  evaluation: { issuer, product_id: productId, installation_id: installationId, now },
  jwks: {
    keys: [{ ...publicKey.export({ format: "jwk" }), alg: "EdDSA", use: "sig", kid }],
  },
  entitlement_cases: [
    { name: "valid_perpetual", token: validPerpetual, expected_state: "valid_perpetual", authorized: true },
    { name: "refresh_due_perpetual", token: signed(payload({ refresh_after: 1_500 })), expected_state: "refresh_due", authorized: true },
    {
      name: "valid_time_limited",
      token: signed(payload({ license_type: "subscription", authorization: { kind: "time_limited", expires_at: 3_000 }, exp: 3_000 })),
      expected_state: "valid_time_limited",
      authorized: true,
    },
    {
      name: "expired_trial",
      token: signed(payload({ license_type: "trial", authorization: { kind: "time_limited", expires_at: 1_900 }, exp: 1_900, refresh_after: 1_800 })),
      expected_state: "expired_time_limited",
      authorized: false,
    },
    {
      name: "expired_subscription",
      token: signed(payload({ license_type: "subscription", authorization: { kind: "time_limited", expires_at: 1_900 }, exp: 1_900 })),
      expected_state: "expired_time_limited",
      authorized: false,
    },
    { name: "tampered_token", token: `${validHeader}.${tamperedBody}.${validSignature}`, expected_state: "invalid", authorized: false, expected_reason: "invalid_entitlement_signature" },
    { name: "invalid_signature", token: `${validHeader}.${validBody}.${invalidSignature}`, expected_state: "invalid", authorized: false, expected_reason: "invalid_entitlement_signature" },
    { name: "wrong_issuer", token: signed(payload({ iss: "https://wrong.example" })), expected_state: "invalid", authorized: false, expected_reason: "entitlement_issuer_mismatch" },
    { name: "wrong_installation", token: signed(payload({ installation_id: "00000000-0000-4000-8000-000000000000" })), expected_state: "invalid", authorized: false, expected_reason: "entitlement_installation_mismatch" },
  ],
  validation_failure_cases: [
    { name: "network_timeout", kind: "timeout", attempt: 0, expected_state: "stale_but_authorized", preserve_authorization: true, retry_after_seconds: 3_600 },
    { name: "dns_failure", kind: "network", attempt: 1, expected_state: "stale_but_authorized", preserve_authorization: true, retry_after_seconds: 21_600 },
    { name: "rate_limited", kind: "api", code: "rate_limited", status: 429, retry_after_seconds: 900, attempt: 0, expected_state: "stale_but_authorized", preserve_authorization: true },
    { name: "server_error", kind: "api", code: "request_failed", status: 503, attempt: 2, expected_state: "stale_but_authorized", preserve_authorization: true, retry_after_seconds: 86_400 },
    { name: "revoked", kind: "api", code: "license_revoked", status: 403, attempt: 0, expected_state: "revoked", preserve_authorization: false },
    { name: "suspended", kind: "api", code: "license_suspended", status: 403, attempt: 0, expected_state: "suspended", preserve_authorization: false },
    { name: "refunded", kind: "api", code: "entitlement_refunded", status: 403, attempt: 0, expected_state: "refunded", preserve_authorization: false },
    { name: "invalid_activation", kind: "api", code: "invalid_activation", status: 401, attempt: 0, expected_state: "invalid_activation", preserve_authorization: false },
    { name: "authoritative_denial", kind: "api", code: "license_denied", status: 403, attempt: 0, expected_state: "server_denied", preserve_authorization: false },
  ],
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(vectors, null, 2) + "\n", "utf8");
console.log(`Wrote ${output}`);
