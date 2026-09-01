import type { ApiError, ApiErrorCode } from "./types";

export class LicensingError extends Error {
  readonly code: ApiErrorCode | "invalid_signature" | "tampered_entitlement" | "offline_entitlement_expired";
  readonly retryable: boolean;
  readonly requestId?: string;

  constructor(
    code: LicensingError["code"],
    message: string,
    options?: { retryable?: boolean; requestId?: string; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "LicensingError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.requestId = options?.requestId;
  }

  static fromApi(error: ApiError, requestId: string) {
    return new LicensingError(error.code, error.message, {
      retryable: error.retryable,
      requestId,
    });
  }
}
