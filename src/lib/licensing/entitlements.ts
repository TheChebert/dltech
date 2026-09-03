import "server-only";

import { randomUUID } from "node:crypto";

import { getSiteUrl } from "@/lib/env";
import { publicJwkFromPrivateKey, signCompactJws } from "@/lib/licensing/crypto";
import { buildEntitlementTiming } from "@/lib/licensing/policy";
import { createAdminClient } from "@/lib/supabase/admin";

type EditionEntitlement = {
  id: string;
  code: string;
  license_type: string;
  activation_required: boolean;
  activation_limit: number;
  version_policy: string;
  refresh_interval_days: number;
  product: { id: string; slug: string; current_version: string | null };
  features: string[];
};

function signingConfig() {
  const privateKey = process.env.DRIFTLINE_ENTITLEMENT_PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing required server environment variable: DRIFTLINE_ENTITLEMENT_PRIVATE_KEY");
  return {
    privateKey,
    keyId: process.env.DRIFTLINE_ENTITLEMENT_KEY_ID || "driftline-entitlement-1",
  };
}

export async function loadEditionEntitlement(productId: string, editionId: string): Promise<EditionEntitlement | null> {
  const supabase = createAdminClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, slug, current_version")
    .eq("slug", productId)
    .eq("status", "available")
    .maybeSingle();
  if (productError) throw new Error("product_lookup_failed");
  if (!product) return null;

  const { data: edition, error: editionError } = await supabase
    .from("product_editions")
    .select("id, code, license_type, activation_required, activation_limit, version_policy, refresh_interval_days")
    .eq("product_id", product.id)
    .eq("code", editionId)
    .eq("active", true)
    .maybeSingle();
  if (editionError) throw new Error("edition_lookup_failed");
  if (!edition) return null;

  const { data: grants, error: grantsError } = await supabase
    .from("edition_features")
    .select("value, features!inner(feature_key)")
    .eq("edition_id", edition.id);
  if (grantsError) throw new Error("feature_lookup_failed");

  const features = (grants ?? [])
    .filter((grant) => grant.value !== false)
    .flatMap((grant) => {
      const value = Array.isArray(grant.features) ? grant.features[0] : grant.features;
      return value?.feature_key ? [value.feature_key as string] : [];
    })
    .sort();

  return { ...edition, product, features } as EditionEntitlement;
}

export function issueEntitlementToken(input: {
  edition: EditionEntitlement;
  licenseId?: string | null;
  installationId?: string | null;
  activationId?: string | null;
  authorizationEndsAt?: string | null;
}) {
  const now = Math.floor(Date.now() / 1000);
  const { privateKey, keyId } = signingConfig();
  const timing = buildEntitlementTiming({
    licenseType: input.edition.license_type,
    refreshIntervalDays: input.edition.refresh_interval_days,
    now,
    authorizationEndsAt: input.authorizationEndsAt,
  });
  const payload = {
    schema_version: 1,
    iss: process.env.DRIFTLINE_ENTITLEMENT_ISSUER || getSiteUrl(),
    aud: input.edition.product.slug,
    sub: input.licenseId || "free:" + input.edition.product.slug,
    jti: randomUUID(),
    iat: now,
    ...timing,
    product_id: input.edition.product.slug,
    edition_id: input.edition.code,
    license_type: input.edition.license_type,
    activation_required: input.edition.activation_required,
    activation_limit: input.edition.activation_limit,
    installation_id: input.installationId || null,
    activation_id: input.activationId || null,
    features: input.edition.features,
    version_entitlement: {
      policy: input.edition.version_policy,
      current_version: input.edition.product.current_version,
    },
  };
  return { token: signCompactJws(payload, privateKey, keyId), payload };
}

export function getEntitlementJwks() {
  const { privateKey, keyId } = signingConfig();
  return { keys: [publicJwkFromPrivateKey(privateKey, keyId)] };
}
