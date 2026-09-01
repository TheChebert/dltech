import "server-only";

import { createPrivateKey, sign } from "node:crypto";

import {
  LICENSE_ENTITLEMENT_SCHEMA_VERSION,
  LICENSE_PROTOCOL_VERSION,
  type SignedEntitlementHeader,
  type SignedEntitlementPayload,
} from "../../../../packages/licensing-sdk/src/types";

import type { DatabaseLicenseState } from "./repository";

const ISSUER = "https://driftlinetech.com" as const;

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function signingKey() {
  const encoded = process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (!encoded) throw new Error("LICENSE_SIGNING_PRIVATE_KEY is not configured.");
  return createPrivateKey({
    key: Buffer.from(encoded, "base64url"),
    format: "der",
    type: "pkcs8",
  });
}

function minimumDate(...values: Array<Date | null>) {
  const dates = values.filter((value): value is Date => Boolean(value));
  return new Date(Math.min(...dates.map((value) => value.getTime())));
}

export function signLicenseState(state: DatabaseLicenseState, installationIdHash: string, now = new Date()) {
  const keyId = process.env.LICENSE_SIGNING_KEY_ID ?? "driftline-license-2026-01";
  const refreshAfter = new Date(now.getTime() + state.refresh_interval_days * 86_400_000);
  const offlineLimit = new Date(refreshAfter.getTime() + state.offline_grace_days * 86_400_000);
  const entitlementExpiry = state.entitlement_expires_at ? new Date(state.entitlement_expires_at) : null;
  const licenseExpiry = state.license_expires_at ? new Date(state.license_expires_at) : null;
  const validUntil = minimumDate(offlineLimit, entitlementExpiry, licenseExpiry);
  const effectiveEntitlementExpiry = minimumDate(
    entitlementExpiry ?? new Date(8_640_000_000_000_000),
    licenseExpiry ?? new Date(8_640_000_000_000_000),
  );

  const payload: SignedEntitlementPayload = {
    schemaVersion: LICENSE_ENTITLEMENT_SCHEMA_VERSION,
    protocolVersion: LICENSE_PROTOCOL_VERSION,
    issuer: ISSUER,
    product: state.product_slug,
    edition: state.edition_slug,
    licenseId: state.license_id,
    installationIdHash,
    licenseType: state.license_type,
    features: state.features,
    versionEntitlement: {
      scope: state.version_scope,
      majorVersion: state.major_version,
    },
    activationLimit: state.activation_limit,
    issuedAt: now.toISOString(),
    refreshAfter: refreshAfter.toISOString(),
    validUntil: validUntil.toISOString(),
    entitlementExpiresAt:
      entitlementExpiry || licenseExpiry ? effectiveEntitlementExpiry.toISOString() : null,
  };
  const header: SignedEntitlementHeader = { alg: "EdDSA", kid: keyId, typ: "DLT+LICENSE" };
  const encodedHeader = base64UrlJson(header);
  const encodedPayload = base64UrlJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(null, Buffer.from(signingInput, "utf8"), signingKey()).toString("base64url");
  return { payload, token: `${signingInput}.${signature}` };
}
