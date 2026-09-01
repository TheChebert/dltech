import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

import { generateLicenseKey, hashLicenseKey, parseLicenseKey, toBytea } from "./keys";

export interface IssueLicenseInput {
  idempotencyKey: string;
  productSlug: string;
  productCode: string;
  editionSlug: string;
  userId?: string;
  customerEmail?: string;
  orderItemId?: string;
  expiresAt?: string;
  majorVersion?: number;
}

function requestHash(input: IssueLicenseInput) {
  const canonical = JSON.stringify({
    productSlug: input.productSlug,
    editionSlug: input.editionSlug,
    userId: input.userId ?? null,
    customerEmail: input.customerEmail?.trim().toLowerCase() ?? null,
    orderItemId: input.orderItemId ?? null,
    expiresAt: input.expiresAt ?? null,
    majorVersion: input.majorVersion ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export async function issueLicense(input: IssueLicenseInput) {
  const licenseKey = generateLicenseKey(input.productCode);
  const parsed = parseLicenseKey(licenseKey)!;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("issue_license_v1", {
    p_idempotency_key: input.idempotencyKey,
    p_request_hash: toBytea(requestHash(input)),
    p_product_slug: input.productSlug,
    p_edition_slug: input.editionSlug,
    p_user_id: input.userId ?? null,
    p_customer_email: input.customerEmail ?? null,
    p_order_item_id: input.orderItemId ?? null,
    p_key_prefix: parsed.prefix,
    p_key_suffix: parsed.suffix,
    p_key_hash: toBytea(hashLicenseKey(licenseKey)),
    p_expires_at: input.expiresAt ?? null,
    p_major_version: input.majorVersion ?? null,
    p_request_id: randomUUID(),
  });
  if (error || !data) throw new Error(`License issuance failed: ${error?.code ?? "missing_result"}`);
  const result = data as { ok: boolean; code?: string; created?: boolean; license_id?: string };
  if (!result.ok) throw new Error(`License issuance rejected: ${result.code ?? "unknown"}`);
  return {
    created: result.created === true,
    licenseId: result.license_id!,
    licenseKey: result.created === true ? licenseKey : null,
  };
}
