import { NextResponse } from "next/server";

import { authorizationEndsAt, evaluateLicense, loadLicenseByKey } from "@/lib/api/licenses";
import { activationSchema } from "@/lib/api/schemas";
import { allowRequest, consumeNonce, createOpaqueToken, getClientIp, sha256Hex, toBytea, writeApiLog } from "@/lib/api/security";
import { getEntitlementJwks, issueEntitlementToken, loadEditionEntitlement } from "@/lib/licensing/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const route = "/api/v1/licenses/activate";
  const ipHash = sha256Hex(getClientIp(request));
  if (!(await allowRequest("license:activate:" + ipHash, 20, 60))) {
    await writeApiLog({ route, method: "POST", status: 429, request, startedAt });
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  }

  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = activationSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const replay = await consumeNonce(route, parsed.data.nonce, parsed.data.timestamp);
  if (!replay.ok) return NextResponse.json({ error: replay.reason }, { status: replay.reason === "replayed_request" ? 409 : 400 });

  const lookup = await loadLicenseByKey(parsed.data.licenseKey);
  if (lookup.unavailable) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!lookup.license) return NextResponse.json({ error: "invalid_license" }, { status: 401 });
  const license = lookup.license;
  const evaluation = evaluateLicense(license, parsed.data.productId);
  if (!evaluation.valid) return NextResponse.json({ error: evaluation.reason }, { status: 403 });

  const edition = await loadEditionEntitlement(parsed.data.productId, license.product_editions!.code);
  if (!edition) return NextResponse.json({ error: "edition_unavailable" }, { status: 503 });

  const supabase = createAdminClient();
  const installationHash = toBytea(sha256Hex(parsed.data.installationId));
  const { data: existingInstallation, error: installationLookupError } = await supabase
    .from("application_installations")
    .select("id, user_id, customer_id")
    .eq("product_id", license.product_id)
    .eq("device_fingerprint_hash", installationHash)
    .maybeSingle();
  if (installationLookupError) return NextResponse.json({ error: "activation_unavailable" }, { status: 503 });

  if (existingInstallation && (existingInstallation.user_id !== license.user_id || existingInstallation.customer_id !== license.customer_id)) {
    return NextResponse.json({ error: "installation_conflict" }, { status: 409 });
  }

  let installationId = existingInstallation?.id as string | undefined;
  if (installationId) {
    const { error } = await supabase.from("application_installations").update({
      device_name: parsed.data.deviceName ?? null,
      platform: parsed.data.platform,
      app_version: parsed.data.appVersion,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    }).eq("id", installationId);
    if (error) return NextResponse.json({ error: "activation_unavailable" }, { status: 503 });
  } else {
    const { data, error } = await supabase.from("application_installations").insert({
      user_id: license.user_id,
      customer_id: license.customer_id,
      product_id: license.product_id,
      device_fingerprint_hash: installationHash,
      device_name: parsed.data.deviceName ?? null,
      platform: parsed.data.platform,
      app_version: parsed.data.appVersion,
    }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "activation_unavailable" }, { status: 503 });
    installationId = data.id;
  }

  const activationToken = createOpaqueToken();
  const activationTokenHash = toBytea(sha256Hex(activationToken));
  const { data: result, error: activationError } = await supabase.rpc("activate_license_installation", {
    p_activation_token_hash: activationTokenHash,
    p_device_name: parsed.data.deviceName ?? null,
    p_installation_id: installationId,
    p_license_id: license.id,
    p_platform: parsed.data.platform,
  });
  if (activationError) {
    console.error("license_activation_failed", { code: activationError.code });
    return NextResponse.json({ error: "activation_unavailable" }, { status: 503 });
  }
  if (result === "activation_limit_reached") return NextResponse.json({ error: "activation_limit_reached" }, { status: 409 });
  if (result !== "activated") return NextResponse.json({ error: "activation_unavailable" }, { status: 503 });

  const { data: activation } = await supabase
    .from("license_activations")
    .select("id")
    .eq("license_id", license.id)
    .eq("installation_id", installationId)
    .single();
  if (!activation) return NextResponse.json({ error: "activation_unavailable" }, { status: 503 });

  const issued = issueEntitlementToken({
    edition,
    licenseId: license.id,
    installationId: parsed.data.installationId,
    activationId: activation.id,
    authorizationEndsAt: authorizationEndsAt(license),
  });
  await Promise.all([
    supabase.from("licenses").update({ last_validated_at: new Date().toISOString() }).eq("id", license.id),
    supabase.from("audit_logs").insert({ actor_type: "service", action: "license.activated", target_type: "license", target_id: license.id, metadata: { installation_id: installationId } }),
    writeApiLog({ route, method: "POST", status: 201, request, startedAt, licenseId: license.id, productId: license.product_id }),
  ]);

  return NextResponse.json({
    activationToken,
    entitlementToken: issued.token,
    entitlement: issued.payload,
    verificationKeys: getEntitlementJwks(),
  }, { status: 201, headers: { "cache-control": "no-store" } });
}
