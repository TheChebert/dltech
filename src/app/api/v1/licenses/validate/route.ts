import { NextResponse } from "next/server";

import { authorizationEndsAt, evaluateLicense, loadActivation, loadLicenseById } from "@/lib/api/licenses";
import { validationSchema } from "@/lib/api/schemas";
import { allowRequest, consumeNonce, getClientIp, sha256Hex, toBytea, writeApiLog } from "@/lib/api/security";
import { getEntitlementJwks, issueEntitlementToken, loadEditionEntitlement } from "@/lib/licensing/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const route = "/api/v1/licenses/validate";
  const ipHash = sha256Hex(getClientIp(request));
  if (!(await allowRequest("license:validate:" + ipHash, 120, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  }

  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = validationSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const replay = await consumeNonce(route, parsed.data.nonce, parsed.data.timestamp);
  if (!replay.ok) return NextResponse.json({ error: replay.reason }, { status: replay.reason === "replayed_request" ? 409 : 400 });

  const activationLookup = await loadActivation(parsed.data.activationToken);
  if (activationLookup.unavailable) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!activationLookup.activation || activationLookup.activation.deactivated_at) {
    return NextResponse.json({ valid: false, error: "invalid_activation" }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const licenseLookup = await loadLicenseById(activationLookup.activation.license_id);
  if (licenseLookup.unavailable) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!licenseLookup.license) return NextResponse.json({ valid: false, error: "invalid_license" }, { status: 401 });
  const license = licenseLookup.license;
  const evaluation = evaluateLicense(license, parsed.data.productId);
  if (!evaluation.valid) return NextResponse.json({ valid: false, error: evaluation.reason }, { status: 403 });

  const supabase = createAdminClient();
  const { data: installation } = await supabase
    .from("application_installations")
    .select("id, device_fingerprint_hash, revoked_at")
    .eq("id", activationLookup.activation.installation_id)
    .maybeSingle();
  if (!installation || installation.revoked_at || installation.device_fingerprint_hash !== toBytea(sha256Hex(parsed.data.installationId))) {
    return NextResponse.json({ valid: false, error: "invalid_activation" }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const edition = await loadEditionEntitlement(parsed.data.productId, license.product_editions!.code);
  if (!edition) return NextResponse.json({ valid: false, error: "edition_unavailable" }, { status: 503 });
  const validatedAt = new Date().toISOString();
  const issued = issueEntitlementToken({
    edition,
    licenseId: license.id,
    installationId: parsed.data.installationId,
    activationId: activationLookup.activation.id,
    authorizationEndsAt: authorizationEndsAt(license),
  });

  await Promise.all([
    supabase.from("license_activations").update({ last_validated_at: validatedAt }).eq("id", activationLookup.activation.id),
    supabase.from("application_installations").update({ last_seen_at: validatedAt, app_version: parsed.data.appVersion }).eq("id", installation.id),
    supabase.from("licenses").update({ last_validated_at: validatedAt }).eq("id", license.id),
    writeApiLog({ route, method: "POST", status: 200, request, startedAt, licenseId: license.id, productId: license.product_id }),
  ]);

  return NextResponse.json({ valid: true, validatedAt, entitlementToken: issued.token, entitlement: issued.payload, verificationKeys: getEntitlementJwks() }, { headers: { "cache-control": "no-store" } });
}
