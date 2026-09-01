import { NextResponse } from "next/server";

import {
  LICENSE_PROTOCOL_VERSION,
  type ApiErrorCode,
  type ApiFailure,
  type ApiSuccess,
} from "../../../packages/licensing-sdk/src/types";

const messages: Record<ApiErrorCode, string> = {
  invalid_request: "The request is invalid.",
  invalid_license: "The license could not be verified.",
  invalid_activation: "The activation could not be verified.",
  license_suspended: "The license is suspended.",
  license_revoked: "The license has been revoked.",
  license_expired: "The license or entitlement has expired.",
  entitlement_suspended: "The entitlement is suspended.",
  entitlement_expired: "The entitlement has expired.",
  activation_limit_reached: "The license has reached its active installation limit.",
  installation_conflict: "This installation is registered to another license owner.",
  installation_revoked: "This installation has been revoked.",
  replayed_request: "The request nonce has already been used.",
  expired_request: "The request timestamp is outside the allowed window.",
  rate_limited: "Too many requests were submitted. Please try again later.",
  not_found: "The requested resource was not found.",
  service_unavailable: "The licensing service is temporarily unavailable.",
};

export function apiSuccess<T>(requestId: string, data: T, status = 200, headers?: HeadersInit) {
  const body: ApiSuccess<T> = { protocolVersion: LICENSE_PROTOCOL_VERSION, requestId, ok: true, data };
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-request-id": requestId, ...headers },
  });
}

export function apiFailure(
  requestId: string,
  code: ApiErrorCode,
  status: number,
  options?: { retryable?: boolean; retryAfter?: number },
) {
  const body: ApiFailure = {
    protocolVersion: LICENSE_PROTOCOL_VERSION,
    requestId,
    ok: false,
    error: {
      code,
      message: messages[code],
      retryable: options?.retryable ?? false,
    },
  };
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-request-id": requestId,
      ...(options?.retryAfter ? { "retry-after": String(options.retryAfter) } : {}),
    },
  });
}
