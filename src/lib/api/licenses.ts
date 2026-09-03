import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sha256Hex, toBytea } from "@/lib/api/security";

export type LoadedLicense = {
  id: string;
  user_id: string | null;
  customer_id: string | null;
  product_id: string;
  edition_id: string | null;
  status: string;
  max_activations: number;
  expires_at: string | null;
  products: { id: string; slug: string; name: string; current_version: string | null; status: string } | null;
  product_editions: { id: string; code: string; license_type: string; activation_required: boolean; activation_limit: number } | null;
  entitlements: { id: string; status: string; starts_at: string; ends_at: string | null; version_policy: string } | null;
};

export type LoadedActivation = {
  id: string;
  license_id: string;
  installation_id: string;
  deactivated_at: string | null;
};

function one<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function normalizeLicense(data: Record<string, unknown>) {
  return {
    ...data,
    products: one(data.products as LoadedLicense["products"]),
    product_editions: one(data.product_editions as LoadedLicense["product_editions"]),
    entitlements: one(data.entitlements as LoadedLicense["entitlements"]),
  } as LoadedLicense;
}

const licenseSelect = "id, user_id, customer_id, product_id, edition_id, status, max_activations, expires_at, products(id, slug, name, current_version, status), product_editions(id, code, license_type, activation_required, activation_limit), entitlements(id, status, starts_at, ends_at, version_policy)";

export async function loadLicenseByKey(licenseKey: string): Promise<{ license: LoadedLicense | null; unavailable: boolean }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("licenses")
    .select(licenseSelect)
    .eq("key_hash", toBytea(sha256Hex(licenseKey.trim())))
    .maybeSingle();
  if (error) {
    console.error("license_lookup_failed", { code: error.code });
    return { license: null, unavailable: true };
  }
  return { license: data ? normalizeLicense(data) : null, unavailable: false };
}

export async function loadLicenseById(licenseId: string): Promise<{ license: LoadedLicense | null; unavailable: boolean }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("licenses").select(licenseSelect).eq("id", licenseId).maybeSingle();
  if (error) {
    console.error("license_lookup_failed", { code: error.code });
    return { license: null, unavailable: true };
  }
  return { license: data ? normalizeLicense(data) : null, unavailable: false };
}

export async function loadActivation(activationToken: string): Promise<{ activation: LoadedActivation | null; unavailable: boolean }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("license_activations")
    .select("id, license_id, installation_id, deactivated_at")
    .eq("activation_token_hash", toBytea(sha256Hex(activationToken)))
    .maybeSingle();
  if (error) {
    console.error("activation_lookup_failed", { code: error.code });
    return { activation: null, unavailable: true };
  }
  return { activation: data as LoadedActivation | null, unavailable: false };
}

export function evaluateLicense(license: LoadedLicense, productId: string) {
  const now = Date.now();
  if (!license.products || license.products.slug !== productId) return { valid: false as const, reason: "invalid_license" };
  if (license.products.status !== "available") return { valid: false as const, reason: "product_unavailable" };
  if (license.status === "revoked") return { valid: false as const, reason: "license_revoked" };
  if (license.status === "suspended") return { valid: false as const, reason: "license_suspended" };
  if (license.status === "expired") return { valid: false as const, reason: "license_expired" };
  if (license.status !== "active") return { valid: false as const, reason: "license_unavailable" };
  if (license.expires_at && new Date(license.expires_at).getTime() <= now) return { valid: false as const, reason: "license_expired" };
  if (!license.entitlements) return { valid: false as const, reason: "entitlement_unavailable" };
  if (license.entitlements.status === "refunded") return { valid: false as const, reason: "entitlement_refunded" };
  if (license.entitlements.status === "suspended") return { valid: false as const, reason: "entitlement_suspended" };
  if (license.entitlements.status === "expired") return { valid: false as const, reason: "entitlement_expired" };
  if (license.entitlements.status !== "active") return { valid: false as const, reason: "entitlement_unavailable" };
  if (new Date(license.entitlements.starts_at).getTime() > now) return { valid: false as const, reason: "entitlement_unavailable" };
  if (license.entitlements.ends_at && new Date(license.entitlements.ends_at).getTime() <= now) return { valid: false as const, reason: "entitlement_expired" };
  if (!license.product_editions || !license.product_editions.activation_required) return { valid: false as const, reason: "edition_configuration_invalid" };
  if (license.product_editions.license_type !== "perpetual" && !authorizationEndsAt(license)) {
    return { valid: false as const, reason: "edition_configuration_invalid" };
  }
  return { valid: true as const };
}

export function authorizationEndsAt(license: LoadedLicense) {
  const values = [license.expires_at, license.entitlements?.ends_at]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
  return values[0] ?? null;
}
