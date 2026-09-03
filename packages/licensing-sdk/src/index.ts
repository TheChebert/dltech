export type EntitlementAuthorization =
  | { kind: "perpetual"; expires_at: null }
  | { kind: "time_limited"; expires_at: number };

export type EntitlementPayload = {
  schema_version: 1;
  iss: string;
  aud: string;
  sub: string;
  jti: string;
  iat: number;
  refresh_after: number;
  exp?: number;
  authorization: EntitlementAuthorization;
  product_id: string;
  edition_id: string;
  license_type: "perpetual" | "subscription" | "trial" | "account";
  activation_required: boolean;
  activation_limit: number;
  installation_id: string | null;
  activation_id: string | null;
  features: string[];
  version_entitlement: { policy: string; current_version: string | null };
};

export type Jwks = { keys: Array<JsonWebKey & { kid: string; alg: "EdDSA"; use: "sig" }> };

export type EntitlementEvaluation =
  | { state: "valid_perpetual" | "valid_time_limited" | "refresh_due"; authorized: true; entitlement: EntitlementPayload }
  | { state: "expired_time_limited"; authorized: false; entitlement: EntitlementPayload }
  | { state: "invalid"; authorized: false; reason: string };

export type LocalAccessState =
  | { state: "baseline"; reason: "no_paid_entitlement" | "verification_keys_missing" | "expired_time_limited" | "invalid_entitlement" }
  | { state: "entitled"; entitlement: EntitlementPayload; refreshDue: boolean };

export type ValidationDisposition =
  | { state: "stale_but_authorized"; preserveAuthorization: true; retryAfterSeconds: number }
  | { state: "revoked" | "suspended" | "refunded" | "invalid_activation" | "server_denied"; preserveAuthorization: false; reason: string };

export class DriftlineApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "DriftlineApiError";
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

type LegacyCompatiblePayload = Omit<EntitlementPayload, "authorization" | "refresh_after"> & {
  authorization?: EntitlementAuthorization;
  refresh_after?: number;
};

function normalizePayload(payload: LegacyCompatiblePayload): EntitlementPayload {
  let authorization = payload.authorization;
  if (!authorization) {
    if (payload.license_type === "perpetual") authorization = { kind: "perpetual", expires_at: null };
    else if (typeof payload.exp === "number") authorization = { kind: "time_limited", expires_at: payload.exp };
    else throw new Error("entitlement_authorization_invalid");
  }

  if (authorization.kind === "time_limited" && !Number.isFinite(authorization.expires_at)) {
    throw new Error("entitlement_authorization_invalid");
  }

  return {
    ...payload,
    authorization,
    refresh_after: payload.refresh_after ?? payload.exp ?? payload.iat,
  };
}

async function verifySignedPayload(
  token: string,
  jwks: Jwks,
  options: { productId: string; installationId?: string; now?: number },
) {
  const [encodedHeader, encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra) throw new Error("invalid_entitlement_token");
  const header = decodeJson<{ alg: string; kid: string; typ: string; v: number }>(encodedHeader);
  if (header.alg !== "EdDSA" || header.typ !== "DLT-ENTITLEMENT+jwt" || header.v !== 1) throw new Error("unsupported_entitlement_token");
  const jwk = jwks.keys.find((key) => key.kid === header.kid && key.alg === "EdDSA" && key.use === "sig");
  if (!jwk) throw new Error("entitlement_key_not_found");
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "Ed25519",
    publicKey,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(encodedHeader + "." + encodedPayload),
  );
  if (!valid) throw new Error("invalid_entitlement_signature");

  const payload = normalizePayload(decodeJson<LegacyCompatiblePayload>(encodedPayload));
  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (payload.schema_version !== 1 || payload.product_id !== options.productId || payload.aud !== options.productId) {
    throw new Error("entitlement_product_mismatch");
  }
  if (payload.iat > now + 300) throw new Error("entitlement_not_yet_valid");
  if (payload.activation_required && (!options.installationId || payload.installation_id !== options.installationId)) {
    throw new Error("entitlement_installation_mismatch");
  }
  return { payload, now };
}

export async function evaluateEntitlementToken(
  token: string,
  jwks: Jwks,
  options: { productId: string; installationId?: string; now?: number },
): Promise<EntitlementEvaluation> {
  try {
    const { payload, now } = await verifySignedPayload(token, jwks, options);
    if (payload.authorization.kind === "time_limited" && payload.authorization.expires_at <= now) {
      return { state: "expired_time_limited", authorized: false, entitlement: payload };
    }
    if (payload.refresh_after <= now) return { state: "refresh_due", authorized: true, entitlement: payload };
    return {
      state: payload.authorization.kind === "perpetual" ? "valid_perpetual" : "valid_time_limited",
      authorized: true,
      entitlement: payload,
    };
  } catch (error) {
    return { state: "invalid", authorized: false, reason: error instanceof Error ? error.message : "invalid_entitlement" };
  }
}

export async function verifyEntitlementToken(
  token: string,
  jwks: Jwks,
  options: { productId: string; installationId?: string; now?: number },
) {
  const evaluation = await evaluateEntitlementToken(token, jwks, options);
  if (evaluation.state === "invalid") throw new Error(evaluation.reason);
  if (evaluation.state === "expired_time_limited") throw new Error("entitlement_expired");
  return evaluation.entitlement;
}

export async function resolveLocalAccess(input: {
  productId: string;
  installationId?: string;
  entitlementToken?: string | null;
  verificationKeys?: Jwks | null;
  now?: number;
}): Promise<LocalAccessState> {
  if (!input.entitlementToken) return { state: "baseline", reason: "no_paid_entitlement" };
  if (!input.verificationKeys) return { state: "baseline", reason: "verification_keys_missing" };
  const evaluation = await evaluateEntitlementToken(input.entitlementToken, input.verificationKeys, input);
  if (evaluation.authorized) {
    return { state: "entitled", entitlement: evaluation.entitlement, refreshDue: evaluation.state === "refresh_due" };
  }
  if (evaluation.state === "expired_time_limited") return { state: "baseline", reason: "expired_time_limited" };
  return { state: "baseline", reason: "invalid_entitlement" };
}

export function hasFeature(entitlement: EntitlementPayload, featureId: string) {
  return entitlement.features.includes(featureId);
}

export function validationRetryDelaySeconds(attempt: number) {
  if (attempt <= 0) return 3600;
  if (attempt === 1) return 21600;
  return 86400;
}

export function classifyValidationFailure(error: unknown, attempt = 0): ValidationDisposition {
  if (error instanceof DriftlineApiError) {
    const stateByCode: Record<string, Exclude<ValidationDisposition["state"], "stale_but_authorized">> = {
      license_revoked: "revoked",
      license_suspended: "suspended",
      entitlement_suspended: "suspended",
      entitlement_refunded: "refunded",
      invalid_activation: "invalid_activation",
    };
    const explicitState = stateByCode[error.code];
    if (explicitState) return { state: explicitState, preserveAuthorization: false, reason: error.code };
    if (error.status === 401 || error.status === 403) {
      return { state: "server_denied", preserveAuthorization: false, reason: error.code };
    }
    if (error.status === 429 || error.status >= 500 || error.status === 408) {
      return {
        state: "stale_but_authorized",
        preserveAuthorization: true,
        retryAfterSeconds: error.retryAfterSeconds ?? validationRetryDelaySeconds(attempt),
      };
    }
  }

  return {
    state: "stale_but_authorized",
    preserveAuthorization: true,
    retryAfterSeconds: validationRetryDelaySeconds(attempt),
  };
}

type Proof = { installationId: string; platform: string; appVersion: string };
type EntitlementResponse = { entitlementToken: string; entitlement: EntitlementPayload; verificationKeys: Jwks };

export function createDriftlineClient(config: { baseUrl: string; productId: string; fetch?: typeof fetch }) {
  const requestFetch = config.fetch ?? fetch;
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await requestFetch(baseUrl + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: T & { error?: string };
    try {
      data = await response.json() as T & { error?: string };
    } catch {
      if (!response.ok) throw new DriftlineApiError("request_failed", response.status);
      throw new DriftlineApiError("invalid_response", response.status);
    }
    if (!response.ok) {
      const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
      throw new DriftlineApiError(data.error || "request_failed", response.status, Number.isFinite(retryAfter) ? retryAfter : undefined);
    }
    return data;
  }
  function proof(value: Proof) {
    return { productId: config.productId, ...value, nonce: crypto.randomUUID(), timestamp: new Date().toISOString() };
  }
  return {
    /** Optional diagnostics/synchronization only. Built-in Free must never depend on this call. */
    resolveFree(appVersion: string, editionId = "free") {
      return post<EntitlementResponse>("/api/v1/entitlements/resolve", { productId: config.productId, editionId, appVersion });
    },
    activate(input: Proof & { licenseKey: string; deviceName?: string }) {
      return post<EntitlementResponse & { activationToken: string }>("/api/v1/licenses/activate", {
        ...proof(input),
        licenseKey: input.licenseKey,
        deviceName: input.deviceName,
      });
    },
    validate(input: Proof & { activationToken: string }) {
      return post<EntitlementResponse & { valid: true; validatedAt: string }>("/api/v1/licenses/validate", {
        ...proof(input),
        activationToken: input.activationToken,
      });
    },
    deactivate(input: Omit<Proof, "appVersion"> & { activationToken: string; reason?: string }) {
      return post<{ deactivated: true; deactivatedAt: string }>("/api/v1/licenses/deactivate", {
        productId: config.productId,
        installationId: input.installationId,
        platform: input.platform,
        activationToken: input.activationToken,
        reason: input.reason,
        nonce: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      });
    },
    async jwks() {
      const response = await requestFetch(baseUrl + "/api/v1/licensing/jwks");
      if (!response.ok) throw new DriftlineApiError("jwks_unavailable", response.status);
      return response.json() as Promise<Jwks>;
    },
  };
}
