import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret || !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url)) {
  throw new Error("Concurrency tests are mutation tests and only run against a local Supabase URL.");
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const bytea = () => `\\x${randomBytes(32).toString("hex")}`;
const keyHash = bytea();
const idempotencyKey = `concurrency-${randomUUID()}`;
const requestHash = bytea();
let entitlementId;

try {
  const { data: issued, error: issuanceError } = await admin.rpc("issue_license_v1", {
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
    p_product_slug: "metatweak",
    p_edition_slug: "pro",
    p_user_id: null,
    p_customer_email: "concurrency-test@example.invalid",
    p_order_item_id: null,
    p_key_prefix: "DL-MT-TEST",
    p_key_suffix: "TEST",
    p_key_hash: keyHash,
    p_expires_at: null,
    p_major_version: 1,
    p_request_id: randomUUID(),
  });
  assert.ifError(issuanceError);
  assert.equal(issued.ok, true);

  const { data: license, error: licenseError } = await admin
    .from("licenses")
    .select("entitlement_id")
    .eq("id", issued.license_id)
    .single();
  assert.ifError(licenseError);
  entitlementId = license.entitlement_id;

  const attempts = await Promise.all(Array.from({ length: 4 }, (_, index) => admin.rpc("activate_license_v1", {
    p_license_key_hash: keyHash,
    p_product_slug: "metatweak",
    p_installation_id_hash: bytea(),
    p_activation_token_hash: bytea(),
    p_platform: "test",
    p_app_version: "1.0.0",
    p_device_name: `concurrent-${index + 1}`,
    p_request_id: randomUUID(),
  })));
  attempts.forEach(({ error }) => assert.ifError(error));
  const results = attempts.map(({ data }) => data);
  assert.equal(results.filter((result) => result.ok).length, 3);
  assert.equal(results.filter((result) => result.code === "activation_limit_reached").length, 1);

  const { count, error: countError } = await admin
    .from("license_activations")
    .select("*", { count: "exact", head: true })
    .eq("license_id", issued.license_id)
    .is("deactivated_at", null);
  assert.ifError(countError);
  assert.equal(count, 3);
  console.log("Concurrent activation invariant passed: 3 accepted, 1 rejected.");
} finally {
  if (entitlementId) await admin.from("entitlements").delete().eq("id", entitlementId);
}
