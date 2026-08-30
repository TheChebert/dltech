import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sha256Hex, toBytea } from "@/lib/api/security";

export type LoadedLicense = {
  id: string;
  user_id: string;
  product_id: string;
  status: string;
  max_activations: number;
  expires_at: string | null;
  products: { id: string; slug: string; name: string; current_version: string | null; status: string } | null;
  entitlements: { id: string; status: string; starts_at: string; ends_at: string | null; version_policy: string } | null;
};

function one<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function loadLicense(licenseKey: string): Promise<LoadedLicense | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("licenses")
    .select("id, user_id, product_id, status, max_activations, expires_at, products(id, slug, name, current_version, status), entitlements(id, status, starts_at, ends_at, version_policy)")
    .eq("key_hash", toBytea(sha256Hex(licenseKey.trim())))
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...data,
    products: one(data.products),
    entitlements: one(data.entitlements),
  } as LoadedLicense;
}

export function evaluateLicense(license: LoadedLicense, productSlug: string) {
  const now = Date.now();
  if (!license.products || license.products.slug !== productSlug) return { valid: false as const, reason: "invalid_license" };
  if (license.status !== "active") return { valid: false as const, reason: "license_unavailable" };
  if (license.expires_at && new Date(license.expires_at).getTime() <= now) return { valid: false as const, reason: "license_expired" };
  if (!license.entitlements || license.entitlements.status !== "active") return { valid: false as const, reason: "entitlement_unavailable" };
  if (new Date(license.entitlements.starts_at).getTime() > now) return { valid: false as const, reason: "entitlement_unavailable" };
  if (license.entitlements.ends_at && new Date(license.entitlements.ends_at).getTime() <= now) return { valid: false as const, reason: "entitlement_expired" };
  return { valid: true as const };
}
