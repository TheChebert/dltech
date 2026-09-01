import "server-only";

import { randomUUID } from "node:crypto";

import type { z } from "zod";

import { apiFailure, apiSuccess } from "@/lib/api/responses";
import {
  allowRequest,
  consumeNonce,
  getClientIp,
  sha256Hex,
  writeApiLog,
} from "@/lib/api/security";

import { LicensingServiceError } from "./service";

type RequestContext = {
  productSlug: string;
  installationId: string;
  nonce: string;
  timestamp: string;
  licenseId?: string;
  licenseKey?: string;
};

interface LicensePostOptions<T extends RequestContext, R> {
  route: string;
  schema: z.ZodType<T>;
  ipLimit: number;
  credentialLimit: number;
  successStatus?: number;
  execute(input: T, requestId: string): Promise<R>;
}

function credentialBucket(input: RequestContext) {
  const credential = input.licenseId ?? input.licenseKey ?? input.installationId;
  return sha256Hex(`${input.productSlug}:${credential}`);
}

export async function handleLicensePost<T extends RequestContext, R>(
  request: Request,
  options: LicensePostOptions<T, R>,
) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const ipBucket = sha256Hex(getClientIp(request));

  const respond = async (
    response: ReturnType<typeof apiSuccess<R>> | ReturnType<typeof apiFailure>,
    licenseId?: string,
  ) => {
    await writeApiLog({
      route: options.route,
      method: "POST",
      status: response.status,
      request,
      requestId,
      startedAt,
      licenseId,
    });
    return response;
  };

  if (!(await allowRequest(`v1:${options.route}:ip:${ipBucket}`, options.ipLimit, 60))) {
    return respond(apiFailure(requestId, "rate_limited", 429, { retryAfter: 60 }));
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 16_384) {
    return respond(apiFailure(requestId, "invalid_request", 400));
  }

  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 16_384) return respond(apiFailure(requestId, "invalid_request", 400));
    raw = JSON.parse(body);
  } catch {
    return respond(apiFailure(requestId, "invalid_request", 400));
  }

  const parsed = options.schema.safeParse(raw);
  if (!parsed.success) return respond(apiFailure(requestId, "invalid_request", 400));

  if (!(await allowRequest(
    `v1:${options.route}:credential:${credentialBucket(parsed.data)}`,
    options.credentialLimit,
    60,
  ))) {
    return respond(apiFailure(requestId, "rate_limited", 429, { retryAfter: 60 }), parsed.data.licenseId);
  }

  const nonce = await consumeNonce(
    `${options.route}:${parsed.data.productSlug}`,
    parsed.data.nonce,
    parsed.data.timestamp,
  );
  if (!nonce.ok) {
    if (nonce.reason === "unavailable") {
      return respond(apiFailure(requestId, "service_unavailable", 503, { retryable: true }), parsed.data.licenseId);
    }
    const code = nonce.reason === "replayed_request" ? "replayed_request" : "expired_request";
    return respond(apiFailure(requestId, code, code === "replayed_request" ? 409 : 400), parsed.data.licenseId);
  }

  try {
    const data = await options.execute(parsed.data, requestId);
    const response = apiSuccess(requestId, data, options.successStatus ?? 200);
    const resultLicenseId = (data as { licenseId?: string }).licenseId ?? parsed.data.licenseId;
    return respond(response, resultLicenseId);
  } catch (error) {
    if (error instanceof LicensingServiceError) {
      return respond(
        apiFailure(requestId, error.code, error.status, { retryable: error.retryable }),
        parsed.data.licenseId,
      );
    }
    console.error("licensing_request_failed", { requestId, route: options.route });
    return respond(
      apiFailure(requestId, "service_unavailable", 503, { retryable: true }),
      parsed.data.licenseId,
    );
  }
}
