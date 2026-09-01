import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LICENSE_KEY_PATTERN = /^DL-([A-Z0-9]{2,8})(?:-[A-HJ-NP-Z2-9]{4}){5}$/;

export function normalizeLicenseKey(value: string) {
  return value.trim().toUpperCase();
}

export function parseLicenseKey(value: string) {
  const normalized = normalizeLicenseKey(value);
  const match = LICENSE_KEY_PATTERN.exec(normalized);
  if (!match) return null;
  const groups = normalized.split("-");
  return {
    normalized,
    productCode: match[1],
    prefix: groups.slice(0, 3).join("-"),
    suffix: groups.at(-1)!,
  };
}

export function generateLicenseKey(productCode: string) {
  const normalizedCode = productCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(normalizedCode)) throw new Error("Invalid product code.");
  const random = randomBytes(20);
  let characters = "";
  for (const byte of random) characters += KEY_ALPHABET[byte & 31];
  const groups = characters.match(/.{4}/g);
  if (!groups || groups.length !== 5) throw new Error("License key generation failed.");
  return `DL-${normalizedCode}-${groups.join("-")}`;
}

export function deriveLicenseKey(
  productCode: string,
  idempotencyKey: string,
  pepper = process.env.LICENSE_KEY_PEPPER,
) {
  const normalizedCode = productCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(normalizedCode) || !pepper || idempotencyKey.length < 8) {
    throw new Error("Deterministic license key generation is not configured.");
  }
  const entropy = createHmac("sha256", pepper)
    .update(`issuance:v1:${normalizedCode}:${idempotencyKey}`, "utf8")
    .digest();
  let characters = "";
  for (const byte of entropy.subarray(0, 20)) characters += KEY_ALPHABET[byte & 31];
  return `DL-${normalizedCode}-${characters.match(/.{4}/g)!.join("-")}`;
}

export function hashLicenseKey(value: string, pepper = process.env.LICENSE_KEY_PEPPER) {
  const parsed = parseLicenseKey(value);
  if (!parsed || !pepper) throw new Error("License key hashing is not configured.");
  return createHmac("sha256", pepper).update(parsed.normalized, "utf8").digest("hex");
}

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function toBytea(hex: string) {
  return `\\x${hex}`;
}
