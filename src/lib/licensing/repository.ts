import "server-only";

import type { LicenseType, LicensingPolicy, VersionEntitlementScope } from "../../../../packages/licensing-sdk/src/types";

import { createAdminClient } from "@/lib/supabase/admin";

export type DatabaseLicenseState = {
  ok: true;
  license_id: string;
  product_id: string;
  product_slug: string;
  edition_slug: string;
  license_type: LicenseType;
  features: string[];
  version_scope: VersionEntitlementScope;
  major_version: number | null;
  activation_limit: number;
  license_expires_at: string | null;
  entitlement_expires_at: string | null;
  refresh_interval_days: number;
  offline_grace_days: number;
  validated_at: string;
};

export type DatabaseLicenseFailure = { ok: false; code: string };
export type DatabaseLicenseResult = DatabaseLicenseState | DatabaseLicenseFailure;

export class LicensingRepositoryError extends Error {
  constructor(readonly operation: string, readonly databaseCode?: string) {
    super(`Licensing repository operation failed: ${operation}`);
    this.name = "LicensingRepositoryError";
  }
}

async function rpc(operation: string, parameters: Record<string, unknown>) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(operation, parameters);
  if (error || !data) throw new LicensingRepositoryError(operation, error?.code);
  return data as DatabaseLicenseResult;
}

export function activateLicenseRecord(parameters: Record<string, unknown>) {
  return rpc("activate_license_v1", parameters);
}

export function validateLicenseRecord(parameters: Record<string, unknown>) {
  return rpc("validate_license_v1", parameters);
}

export function refreshLicenseRecord(parameters: Record<string, unknown>) {
  return rpc("refresh_license_v1", parameters);
}

export function deactivateLicenseRecord(parameters: Record<string, unknown>) {
  return rpc("deactivate_license_v1", parameters);
}

type EditionRow = {
  slug: string;
  name: string;
  license_type: LicenseType;
  activation_required: boolean;
  account_required: boolean;
  default_activation_limit: number;
  default_version_scope: VersionEntitlementScope;
  default_major_version: number | null;
  is_default: boolean;
  status: string;
  edition_features: Array<{
    product_features: { feature_key: string } | Array<{ feature_key: string }> | null;
  }>;
};

type ProductPolicyRow = {
  slug: string;
  name: string;
  license_protocol_version: number;
  product_editions: EditionRow[];
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function loadLicensingPolicy(productSlug: string): Promise<LicensingPolicy | null> {
  const supabase = createAdminClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("slug, name, license_protocol_version, product_editions(slug, name, license_type, activation_required, account_required, default_activation_limit, default_version_scope, default_major_version, is_default, status, edition_features(product_features(feature_key)))")
    .eq("slug", productSlug)
    .in("status", ["planned", "private_beta", "available"])
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw new LicensingRepositoryError("load_licensing_policy", error.code);
  if (!product) return null;

  const { data: signingKey, error: keyError } = await supabase
    .from("license_signing_keys")
    .select("key_id, algorithm, public_key_spki")
    .eq("status", "active")
    .lte("not_before", new Date().toISOString())
    .or(`not_after.is.null,not_after.gt.${new Date().toISOString()}`)
    .maybeSingle();
  if (keyError || !signingKey) throw new LicensingRepositoryError("load_signing_key", keyError?.code);

  const row = product as unknown as ProductPolicyRow;
  const editions = row.product_editions
    .filter((edition) => edition.status === "active")
    .map((edition) => ({
      slug: edition.slug,
      name: edition.name,
      licenseType: edition.license_type,
      activationRequired: edition.activation_required,
      accountRequired: edition.account_required,
      activationLimit: edition.default_activation_limit,
      versionEntitlement: {
        scope: edition.default_version_scope,
        majorVersion: edition.default_major_version,
      },
      features: edition.edition_features.flatMap((join) => {
        const feature = one(join.product_features);
        return feature ? [feature.feature_key] : [];
      }).sort(),
    }));
  const defaultEdition = row.product_editions.find((edition) => edition.status === "active" && edition.is_default)?.slug ?? null;

  return {
    product: {
      slug: row.slug,
      name: row.name,
      protocolVersion: 1,
      defaultEdition,
    },
    editions,
    signing: {
      algorithm: "Ed25519",
      keyId: signingKey.key_id,
      publicKeySpki: signingKey.public_key_spki,
    },
    requestPolicy: {
      nonceRequired: true,
      timestampToleranceSeconds: 300,
    },
  };
}

export async function loadLatestVersion(productSlug: string, channel: "stable" | "beta" | "alpha") {
  const supabase = createAdminClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id, slug, name")
    .eq("slug", productSlug)
    .in("status", ["private_beta", "available"])
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw new LicensingRepositoryError("load_product_version", error.code);
  if (!product) return null;
  const { data: version, error: versionError } = await supabase
    .from("product_versions")
    .select("version, major_version, channel, release_notes, minimum_supported_version, critical, published_at")
    .eq("product_id", product.id)
    .eq("channel", channel)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (versionError) throw new LicensingRepositoryError("load_product_version", versionError.code);
  return version ? { product: { slug: product.slug, name: product.name }, version } : null;
}
