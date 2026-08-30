import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function toBytea(hex: string) {
  return "\\x" + hex;
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function secretsEqual(left: string, right: string) {
  const leftHash = Buffer.from(sha256Hex(left), "hex");
  const rightHash = Buffer.from(sha256Hex(right), "hex");
  return timingSafeEqual(leftHash, rightHash);
}

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function allowRequest(bucket: string, limit: number, windowSeconds: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_bucket_key: bucket,
    p_request_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate_limit_check_failed", { code: error.code });
    return false;
  }
  return data === true;
}

export async function consumeNonce(scope: string, nonce: string, timestamp: string) {
  const requestTime = new Date(timestamp);
  if (Number.isNaN(requestTime.getTime())) return { ok: false as const, reason: "invalid_timestamp" };
  const drift = Math.abs(Date.now() - requestTime.getTime());
  if (drift > 5 * 60 * 1000) return { ok: false as const, reason: "expired_request" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("request_nonces").insert({
    scope,
    nonce_hash: toBytea(sha256Hex(nonce)),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  if (error?.code === "23505") return { ok: false as const, reason: "replayed_request" };
  if (error) {
    console.error("nonce_write_failed", { code: error.code });
    return { ok: false as const, reason: "unavailable" };
  }
  return { ok: true as const };
}

export async function writeApiLog(input: {
  route: string;
  method: string;
  status: number;
  request: Request;
  startedAt: number;
  productId?: string | null;
  licenseId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("api_request_logs").insert({
      route: input.route,
      method: input.method,
      response_status: input.status,
      ip_address: getClientIp(input.request) === "unknown" ? null : getClientIp(input.request),
      duration_ms: Date.now() - input.startedAt,
      product_id: input.productId ?? null,
      license_id: input.licenseId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Operational logging must not change the response path.
  }
}
