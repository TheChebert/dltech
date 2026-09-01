export const LICENSE_PROTOCOL_VERSION = 1 as const;
export const LICENSE_ENTITLEMENT_SCHEMA_VERSION = 1 as const;

export type LicenseType = "free" | "perpetual" | "subscription";
export type VersionEntitlementScope = "all_versions" | "major";

export type ApiErrorCode =
  | "invalid_request"
  | "invalid_license"
  | "invalid_activation"
  | "license_suspended"
  | "license_revoked"
  | "license_expired"
  | "entitlement_suspended"
  | "entitlement_expired"
  | "activation_limit_reached"
  | "installation_conflict"
  | "installation_revoked"
  | "replayed_request"
  | "expired_request"
  | "rate_limited"
  | "not_found"
  | "service_unavailable";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
}

export interface ApiSuccess<T> {
  protocolVersion: typeof LICENSE_PROTOCOL_VERSION;
  requestId: string;
  ok: true;
  data: T;
}

export interface ApiFailure {
  protocolVersion: typeof LICENSE_PROTOCOL_VERSION;
  requestId: string;
  ok: false;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface LicenseRequestContext {
  protocolVersion: typeof LICENSE_PROTOCOL_VERSION;
  productSlug: string;
  installationId: string;
  platform: string;
  appVersion: string;
  nonce: string;
  timestamp: string;
}

export interface ActivationRequest extends LicenseRequestContext {
  licenseKey: string;
  deviceName?: string;
}

export interface ActivatedLicenseRequest extends LicenseRequestContext {
  licenseId: string;
  activationToken: string;
}

export interface DeactivationRequest extends ActivatedLicenseRequest {
  reason?: string;
}

export interface SignedEntitlementHeader {
  alg: "EdDSA";
  kid: string;
  typ: "DLT+LICENSE";
}

export interface SignedEntitlementPayload {
  schemaVersion: typeof LICENSE_ENTITLEMENT_SCHEMA_VERSION;
  protocolVersion: typeof LICENSE_PROTOCOL_VERSION;
  issuer: "https://driftlinetech.com";
  product: string;
  edition: string;
  licenseId: string;
  installationIdHash: string;
  licenseType: LicenseType;
  features: string[];
  versionEntitlement: {
    scope: VersionEntitlementScope;
    majorVersion: number | null;
  };
  activationLimit: number;
  issuedAt: string;
  refreshAfter: string;
  validUntil: string;
  entitlementExpiresAt: string | null;
}

export interface LicenseGrant {
  licenseId: string;
  activationToken?: string;
  signedEntitlement: string;
  entitlement: SignedEntitlementPayload;
}

export interface DeactivationResult {
  deactivated: true;
  deactivatedAt: string;
}

export interface LicensingEdition {
  slug: string;
  name: string;
  licenseType: LicenseType;
  activationRequired: boolean;
  accountRequired: boolean;
  activationLimit: number;
  versionEntitlement: {
    scope: VersionEntitlementScope;
    majorVersion: number | null;
  };
  features: string[];
}

export interface LicensingPolicy {
  product: {
    slug: string;
    name: string;
    protocolVersion: typeof LICENSE_PROTOCOL_VERSION;
    defaultEdition: string | null;
  };
  editions: LicensingEdition[];
  signing: {
    algorithm: "Ed25519";
    keyId: string;
    publicKeySpki: string;
  };
  requestPolicy: {
    nonceRequired: true;
    timestampToleranceSeconds: number;
  };
}

export interface StoredLicense {
  productSlug: string;
  installationId: string;
  licenseId: string;
  activationToken: string;
  signedEntitlement: string;
  signingKeyId: string;
  publicKeySpki: string;
  storedAt: string;
}

export type OfflineEntitlementState = "valid" | "refresh_due" | "expired";
