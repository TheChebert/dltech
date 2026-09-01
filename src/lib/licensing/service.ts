import "server-only";

import { randomBytes } from "node:crypto";

import type { ApiErrorCode, LicenseGrant } from "../../../packages/licensing-sdk/src/types";

import type { ActivatedLicenseInput, ActivationInput, DeactivationInput } from "./schemas";
import { hashLicenseKey, parseLicenseKey, sha256, toBytea } from "./keys";
import {
  activateLicenseRecord,
  deactivateLicenseRecord,
  LicensingRepositoryError,
  refreshLicenseRecord,
  validateLicenseRecord,
  type DatabaseLicenseResult,
  type DatabaseLicenseState,
} from "./repository";
import { signLicenseState } from "./signing";

export class LicensingServiceError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    readonly retryable = false,
  ) {
    super(code);
    this.name = "LicensingServiceError";
  }
}

function opaqueToken() {
  return randomBytes(32).toString("base64url");
}

function mapFailure(result: DatabaseLicenseResult): DatabaseLicenseState {
  if (result.ok) return result;
  const mapped: Record<string, [ApiErrorCode, number, boolean?]> = {
    invalid_license: ["invalid_license", 401],
    wrong_product: ["invalid_license", 401],
    license_pending: ["invalid_license", 401],
    license_suspended: ["license_suspended", 403],
    license_revoked: ["license_revoked", 403],
    license_expired: ["license_expired", 403],
    entitlement_suspended: ["entitlement_suspended", 403],
    entitlement_refunded: ["license_revoked", 403],
    entitlement_expired: ["license_expired", 403],
    entitlement_not_started: ["license_suspended", 403],
    activation_limit_reached: ["activation_limit_reached", 409],
    installation_conflict: ["installation_conflict", 409],
    installation_revoked: ["installation_revoked", 403],
    invalid_activation: ["invalid_activation", 401],
  };
  const [code, status, retryable] = mapped[result.code] ?? ["service_unavailable", 503, true];
  throw new LicensingServiceError(code, status, retryable);
}

function grant(state: DatabaseLicenseState, installationIdHash: string, activationToken?: string): LicenseGrant {
  const signed = signLicenseState(state, installationIdHash);
  return {
    licenseId: state.license_id,
    activationToken,
    signedEntitlement: signed.token,
    entitlement: signed.payload,
  };
}

export async function activateLicense(input: ActivationInput, requestId: string) {
  const parsedKey = parseLicenseKey(input.licenseKey);
  if (!parsedKey) throw new LicensingServiceError("invalid_license", 401);
  const activationToken = opaqueToken();
  const installationIdHash = sha256(input.installationId);
  try {
    const result = await activateLicenseRecord({
      p_license_key_hash: toBytea(hashLicenseKey(parsedKey.normalized)),
      p_product_slug: input.productSlug,
      p_installation_id_hash: toBytea(installationIdHash),
      p_activation_token_hash: toBytea(sha256(activationToken)),
      p_platform: input.platform,
      p_app_version: input.appVersion,
      p_device_name: input.deviceName ?? null,
      p_request_id: requestId,
    });
    return grant(mapFailure(result), installationIdHash, activationToken);
  } catch (error) {
    if (error instanceof LicensingServiceError) throw error;
    if (error instanceof LicensingRepositoryError) {
      throw new LicensingServiceError("service_unavailable", 503, true);
    }
    throw error;
  }
}

export async function validateLicense(input: ActivatedLicenseInput, requestId: string) {
  const installationIdHash = sha256(input.installationId);
  try {
    const result = await validateLicenseRecord({
      p_license_id: input.licenseId,
      p_product_slug: input.productSlug,
      p_installation_id_hash: toBytea(installationIdHash),
      p_activation_token_hash: toBytea(sha256(input.activationToken)),
      p_app_version: input.appVersion,
      p_request_id: requestId,
    });
    return grant(mapFailure(result), installationIdHash);
  } catch (error) {
    if (error instanceof LicensingServiceError) throw error;
    throw new LicensingServiceError("service_unavailable", 503, true);
  }
}

export async function refreshLicense(input: ActivatedLicenseInput, requestId: string) {
  const installationIdHash = sha256(input.installationId);
  const activationToken = opaqueToken();
  try {
    const result = await refreshLicenseRecord({
      p_license_id: input.licenseId,
      p_product_slug: input.productSlug,
      p_installation_id_hash: toBytea(installationIdHash),
      p_activation_token_hash: toBytea(sha256(input.activationToken)),
      p_new_activation_token_hash: toBytea(sha256(activationToken)),
      p_app_version: input.appVersion,
      p_request_id: requestId,
    });
    return grant(mapFailure(result), installationIdHash, activationToken);
  } catch (error) {
    if (error instanceof LicensingServiceError) throw error;
    throw new LicensingServiceError("service_unavailable", 503, true);
  }
}

export async function deactivateLicense(input: DeactivationInput, requestId: string) {
  try {
    const result = await deactivateLicenseRecord({
      p_license_id: input.licenseId,
      p_product_slug: input.productSlug,
      p_installation_id_hash: toBytea(sha256(input.installationId)),
      p_activation_token_hash: toBytea(sha256(input.activationToken)),
      p_revoked_token_hash: toBytea(sha256(opaqueToken())),
      p_reason: input.reason ?? null,
      p_request_id: requestId,
    });
    if (!result.ok) mapFailure(result);
    return {
      deactivated: true as const,
      deactivatedAt: String((result as unknown as { deactivated_at: string }).deactivated_at),
    };
  } catch (error) {
    if (error instanceof LicensingServiceError) throw error;
    throw new LicensingServiceError("service_unavailable", 503, true);
  }
}
