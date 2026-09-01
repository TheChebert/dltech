import { LicensingError } from "./errors";
import {
  LICENSE_ENTITLEMENT_SCHEMA_VERSION,
  LICENSE_PROTOCOL_VERSION,
  type OfflineEntitlementState,
  type SignedEntitlementHeader,
  type SignedEntitlementPayload,
} from "./types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function installationHash(installationId: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", textEncoder.encode(installationId));
  return bytesToHex(new Uint8Array(digest));
}

export function parseSignedEntitlement(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new LicensingError("tampered_entitlement", "The entitlement format is invalid.");
  }

  try {
    const header = JSON.parse(textDecoder.decode(base64UrlToBytes(parts[0]))) as SignedEntitlementHeader;
    const payload = JSON.parse(textDecoder.decode(base64UrlToBytes(parts[1]))) as SignedEntitlementPayload;
    return { header, payload, signature: parts[2], signingInput: `${parts[0]}.${parts[1]}` };
  } catch (error) {
    throw new LicensingError("tampered_entitlement", "The entitlement could not be decoded.", { cause: error });
  }
}

export function evaluateOfflineEntitlement(
  payload: SignedEntitlementPayload,
  now = new Date(),
): OfflineEntitlementState {
  const current = now.getTime();
  const entitlementExpiry = payload.entitlementExpiresAt
    ? new Date(payload.entitlementExpiresAt).getTime()
    : Number.POSITIVE_INFINITY;
  const validUntil = new Date(payload.validUntil).getTime();
  if (current >= entitlementExpiry || current >= validUntil) return "expired";
  if (current >= new Date(payload.refreshAfter).getTime()) return "refresh_due";
  return "valid";
}

export async function verifySignedEntitlement(
  token: string,
  options: {
    publicKeySpki: string;
    keyId: string;
    productSlug: string;
    installationId: string;
    now?: Date;
  },
) {
  const parsed = parseSignedEntitlement(token);
  if (
    parsed.header.alg !== "EdDSA"
    || parsed.header.typ !== "DLT+LICENSE"
    || parsed.header.kid !== options.keyId
  ) {
    throw new LicensingError("invalid_signature", "The entitlement signing key is not trusted.");
  }

  const publicKey = await globalThis.crypto.subtle.importKey(
    "spki",
    base64UrlToBytes(options.publicKeySpki),
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  const verified = await globalThis.crypto.subtle.verify(
    "Ed25519",
    publicKey,
    base64UrlToBytes(parsed.signature),
    textEncoder.encode(parsed.signingInput),
  );
  if (!verified) throw new LicensingError("invalid_signature", "The entitlement signature is invalid.");

  if (
    parsed.payload.schemaVersion !== LICENSE_ENTITLEMENT_SCHEMA_VERSION
    || parsed.payload.protocolVersion !== LICENSE_PROTOCOL_VERSION
    || parsed.payload.product !== options.productSlug
    || parsed.payload.installationIdHash !== await installationHash(options.installationId)
  ) {
    throw new LicensingError("tampered_entitlement", "The entitlement does not match this application installation.");
  }

  const state = evaluateOfflineEntitlement(parsed.payload, options.now);
  if (state === "expired") {
    throw new LicensingError("offline_entitlement_expired", "The stored entitlement requires online refresh.", {
      retryable: true,
    });
  }

  return { payload: parsed.payload, state };
}
