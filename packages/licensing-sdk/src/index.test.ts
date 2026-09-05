import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  DriftlineApiError,
  classifyValidationFailure,
  createDriftlineClient,
  evaluateEntitlementToken,
  hasFeature,
  resolveLocalAccess,
  validationRetryDelaySeconds,
  verifyEntitlementToken,
  type EntitlementEvaluation,
  type EntitlementPayload,
  type EntitlementVerificationOptions,
  type Jwks,
  type ValidationDisposition,
} from "./index";

type SharedVectors = {
  evaluation: { issuer: string; product_id: string; installation_id: string; now: number };
  jwks: Jwks;
  entitlement_cases: Array<{
    name: string;
    token: string;
    expected_state: EntitlementEvaluation["state"];
    authorized: boolean;
    expected_reason?: string;
  }>;
  validation_failure_cases: Array<{
    name: string;
    kind: "api" | "timeout" | "network";
    code?: string;
    status?: number;
    attempt: number;
    expected_state: ValidationDisposition["state"];
    preserve_authorization: boolean;
    retry_after_seconds?: number;
  }>;
};

const sharedVectors = JSON.parse(readFileSync(
  new URL("../../../contracts/licensing/protocol-v1.test-vectors.json", import.meta.url),
  "utf8",
)) as SharedVectors;

describe("shared protocol v1 parity vectors", () => {
  it.each(sharedVectors.entitlement_cases)("evaluates $name identically", async (testCase) => {
    const result = await evaluateEntitlementToken(testCase.token, sharedVectors.jwks, {
      productId: sharedVectors.evaluation.product_id,
      issuer: sharedVectors.evaluation.issuer,
      installationId: sharedVectors.evaluation.installation_id,
      now: sharedVectors.evaluation.now,
    });
    expect(result.state).toBe(testCase.expected_state);
    expect(result.authorized).toBe(testCase.authorized);
    if (testCase.expected_reason) expect(result).toMatchObject({ reason: testCase.expected_reason });
  });

  it.each(sharedVectors.validation_failure_cases)("classifies $name identically", (testCase) => {
    const error = testCase.kind === "api"
      ? new DriftlineApiError(
          testCase.code ?? "request_failed",
          testCase.status ?? 500,
          testCase.name === "rate_limited" ? testCase.retry_after_seconds : undefined,
        )
      : new TypeError(testCase.kind === "timeout" ? "request timed out" : "network unavailable");
    const result = classifyValidationFailure(error, testCase.attempt);
    expect(result.state).toBe(testCase.expected_state);
    expect(result.preserveAuthorization).toBe(testCase.preserve_authorization);
    if (testCase.preserve_authorization && testCase.retry_after_seconds) {
      expect(result).toMatchObject({ retryAfterSeconds: testCase.retry_after_seconds });
    }
  });
});

function perpetualPayload(overrides: Partial<EntitlementPayload> = {}): EntitlementPayload {
  return {
    schema_version: 1,
    iss: "https://driftlinetech.com",
    aud: "metatweak",
    sub: "license-id",
    jti: "8d2bc42e-9d0f-4e78-9192-93e63f43d17c",
    iat: 1000,
    refresh_after: 2000,
    authorization: { kind: "perpetual", expires_at: null },
    product_id: "metatweak",
    edition_id: "pro",
    license_type: "perpetual",
    activation_required: true,
    activation_limit: 3,
    installation_id: "8b66a270-61da-4e51-9f0c-2f65bde2337e",
    activation_id: "bb66a270-61da-4e51-9f0c-2f65bde2337e",
    features: ["batch_editing"],
    version_entitlement: { policy: "all_versions", current_version: null },
    ...overrides,
  };
}

function createToken(payload: object, keys = generateKeyPairSync("ed25519")) {
  const header = Buffer.from(JSON.stringify({ alg: "EdDSA", kid: "sdk-test", typ: "DLT-ENTITLEMENT+jwt", v: 1 })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(null, Buffer.from(header + "." + body), keys.privateKey).toString("base64url");
  const jwks = { keys: [{ ...keys.publicKey.export({ format: "jwk" }), alg: "EdDSA", use: "sig", kid: "sdk-test" }] } as Jwks;
  return { token: [header, body, signature].join("."), jwks, keys };
}

describe("licensing SDK local-first baseline", () => {
  it("starts in the built-in baseline on a first-ever offline launch", async () => {
    await expect(resolveLocalAccess({ productId: "metatweak" })).resolves.toEqual({
      state: "baseline",
      reason: "no_paid_entitlement",
    });
  });

  it("requires no token, account, license key, activation, or JWKS for baseline access", async () => {
    const result = await resolveLocalAccess({
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      entitlementToken: null,
      verificationKeys: null,
    });
    expect(result.state).toBe("baseline");
  });

  it("performs no network request for baseline access", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    await resolveLocalAccess({ productId: "metatweak" });
    expect(network).not.toHaveBeenCalled();
    network.mockRestore();
  });

  it("falls back to the baseline when verification material is absent", async () => {
    const { token } = createToken(perpetualPayload());
    await expect(resolveLocalAccess({
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      entitlementToken: token,
    })).resolves.toEqual({
      state: "baseline",
      reason: "verification_keys_missing",
    });
  });
});

describe("licensing SDK offline certificate evaluation", () => {
  it("reports a current perpetual certificate as valid", async () => {
    const { token, jwks } = createToken(perpetualPayload());
    const result = await evaluateEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: perpetualPayload().installation_id!,
      now: 1500,
    });
    expect(result.state).toBe("valid_perpetual");
    expect(result.authorized).toBe(true);
  });

  it("keeps a perpetual certificate authorized after refresh is due", async () => {
    const payload = perpetualPayload();
    const { token, jwks } = createToken(payload);
    const result = await evaluateEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 5000,
    });
    expect(result).toMatchObject({ state: "refresh_due", authorized: true });
    await expect(verifyEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 5000,
    })).resolves.toMatchObject({ edition_id: "pro" });
  });

  it("treats a legacy perpetual exp as refresh timing instead of a kill switch", async () => {
    const payload = perpetualPayload();
    const legacy = { ...payload, exp: 2000 } as Record<string, unknown>;
    delete legacy.authorization;
    delete legacy.refresh_after;
    const { token, jwks } = createToken(legacy);
    const result = await evaluateEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 5000,
    });
    expect(result).toMatchObject({ state: "refresh_due", authorized: true });
  });

  it("verifies with the public key cached during activation", async () => {
    const payload = perpetualPayload();
    const { token, jwks } = createToken(payload);
    const local = await resolveLocalAccess({
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      entitlementToken: token,
      verificationKeys: jwks,
      now: 1500,
    });
    expect(local).toMatchObject({ state: "entitled", refreshDue: false });
    if (local.state === "entitled") expect(hasFeature(local.entitlement, "batch_editing")).toBe(true);
  });

  it("reports a current time-limited certificate as valid", async () => {
    const payload = perpetualPayload({
      license_type: "trial",
      authorization: { kind: "time_limited", expires_at: 3000 },
      exp: 3000,
    });
    const { token, jwks } = createToken(payload);
    const result = await evaluateEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 1500,
    });
    expect(result).toMatchObject({ state: "valid_time_limited", authorized: true });
  });

  it("hard-expires a trial while offline", async () => {
    const payload = perpetualPayload({
      license_type: "trial",
      authorization: { kind: "time_limited", expires_at: 3000 },
      exp: 3000,
      refresh_after: 2500,
    });
    const { token, jwks } = createToken(payload);
    const result = await evaluateEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 3000,
    });
    expect(result).toMatchObject({ state: "expired_time_limited", authorized: false });
    await expect(verifyEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 3000,
    })).rejects.toThrow("entitlement_expired");
  });

  it("hard-expires a subscription while offline", async () => {
    const payload = perpetualPayload({
      license_type: "subscription",
      authorization: { kind: "time_limited", expires_at: 1900 },
      exp: 1900,
    });
    const { token, jwks } = createToken(payload);
    await expect(evaluateEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 2000,
    })).resolves.toMatchObject({ state: "expired_time_limited" });
  });

  it("rejects a malformed signed authorization object", async () => {
    const payload = perpetualPayload({
      authorization: { kind: "unexpected", expires_at: null } as unknown as EntitlementPayload["authorization"],
    });
    const { token, jwks } = createToken(payload);
    await expect(evaluateEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 1500,
    })).resolves.toMatchObject({
      state: "invalid",
      authorized: false,
      reason: "entitlement_authorization_invalid",
    });
  });

  it("rejects a tampered payload", async () => {
    const payload = perpetualPayload();
    const { token, jwks } = createToken(payload);
    const [header, , signature] = token.split(".");
    const tamperedBody = Buffer.from(JSON.stringify({ ...payload, edition_id: "pro-plus" })).toString("base64url");
    const result = await evaluateEntitlementToken([header, tamperedBody, signature].join("."), jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 1500,
    });
    expect(result).toMatchObject({ state: "invalid", authorized: false, reason: "invalid_entitlement_signature" });
  });

  it("rejects a product mismatch", async () => {
    const payload = perpetualPayload();
    const { token, jwks } = createToken(payload);
    await expect(evaluateEntitlementToken(token, jwks, { productId: "another-product", issuer: "https://driftlinetech.com", now: 1500 })).resolves.toMatchObject({
      state: "invalid",
      reason: "entitlement_product_mismatch",
    });
  });

  it("rejects paid material when the expected issuer is omitted", async () => {
    const payload = perpetualPayload();
    const { token, jwks } = createToken(payload);
    const missingIssuer = {
      productId: "metatweak",
      installationId: payload.installation_id!,
      now: 1500,
    } as unknown as EntitlementVerificationOptions;
    await expect(evaluateEntitlementToken(token, jwks, missingIssuer)).resolves.toMatchObject({
      state: "invalid",
      reason: "entitlement_issuer_mismatch",
    });
  });

  it("rejects an installation mismatch", async () => {
    const { token, jwks } = createToken(perpetualPayload());
    await expect(evaluateEntitlementToken(token, jwks, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: "1b66a270-61da-4e51-9f0c-2f65bde2337e",
      now: 1500,
    })).resolves.toMatchObject({ state: "invalid", reason: "entitlement_installation_mismatch" });
  });
});

describe("validation outage and denial policy", () => {
  it("preserves authorization on a network timeout", () => {
    const timeout = new Error("timed out");
    timeout.name = "AbortError";
    expect(classifyValidationFailure(timeout)).toMatchObject({ state: "stale_but_authorized", preserveAuthorization: true });
  });

  it("preserves authorization on a DNS/network failure", () => {
    expect(classifyValidationFailure(new TypeError("fetch failed"))).toMatchObject({ state: "stale_but_authorized", preserveAuthorization: true });
  });

  it("preserves authorization and honors retry-after on 429", () => {
    expect(classifyValidationFailure(new DriftlineApiError("rate_limited", 429, 120))).toEqual({
      state: "stale_but_authorized",
      preserveAuthorization: true,
      retryAfterSeconds: 120,
    });
  });

  it("preserves authorization on a licensing-service 5xx", () => {
    expect(classifyValidationFailure(new DriftlineApiError("service_unavailable", 503), 2)).toEqual({
      state: "stale_but_authorized",
      preserveAuthorization: true,
      retryAfterSeconds: 86400,
    });
  });

  it("removes authorization after an authoritative revocation", () => {
    expect(classifyValidationFailure(new DriftlineApiError("license_revoked", 403))).toEqual({
      state: "revoked",
      preserveAuthorization: false,
      reason: "license_revoked",
    });
  });

  it("removes authorization after an authoritative suspension", () => {
    expect(classifyValidationFailure(new DriftlineApiError("license_suspended", 403))).toMatchObject({
      state: "suspended",
      preserveAuthorization: false,
    });
  });

  it("removes authorization after a refund", () => {
    expect(classifyValidationFailure(new DriftlineApiError("entitlement_refunded", 403))).toMatchObject({
      state: "refunded",
      preserveAuthorization: false,
    });
  });

  it("removes authorization after a deactivated token is definitively rejected", () => {
    expect(classifyValidationFailure(new DriftlineApiError("invalid_activation", 401))).toMatchObject({
      state: "invalid_activation",
      preserveAuthorization: false,
    });
  });

  it("uses bounded retry backoff", () => {
    expect([0, 1, 2, 20].map(validationRetryDelaySeconds)).toEqual([3600, 21600, 86400, 86400]);
  });
});

describe("client refresh responses", () => {
  it("accepts a successful validation refresh with a new freshness window and cached keys", async () => {
    const payload = perpetualPayload({ iat: 3000, refresh_after: 5000 });
    const signed = createToken(payload);
    const request = vi.fn(async () => new Response(JSON.stringify({
      valid: true,
      validatedAt: "1970-01-01T00:50:00.000Z",
      entitlementToken: signed.token,
      entitlement: payload,
      verificationKeys: signed.jwks,
    }), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
    const client = createDriftlineClient({
      baseUrl: "https://example.test",
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      fetch: request,
    });
    const response = await client.validate({
      activationToken: "a".repeat(32),
      installationId: payload.installation_id!,
      platform: "windows",
      appVersion: "1.0.0",
    });
    expect(response.verificationKeys).toEqual(signed.jwks);
    await expect(evaluateEntitlementToken(response.entitlementToken, response.verificationKeys, {
      productId: "metatweak",
      issuer: "https://driftlinetech.com",
      installationId: payload.installation_id!,
      now: 3500,
    })).resolves.toMatchObject({ state: "valid_perpetual", authorized: true });
  });
});
