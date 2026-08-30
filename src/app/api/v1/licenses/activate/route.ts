import { NextResponse } from "next/server";

import { evaluateLicense, loadLicense } from "@/lib/api/licenses";
import { activationSchema } from "@/lib/api/schemas";
import { allowRequest, consumeNonce, createOpaqueToken, getClientIp, sha256Hex, toBytea, writeApiLog } from "@/lib/api/security";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const route = "/api/v1/licenses/activate";
  const ipHash = sha256Hex(getClientIp(request));

  if (!(await allowRequest("license:activate:" + ipHash, 20, 60))) {
    await writeApiLog({ route, method: "POST", status: 429, request, startedAt });
    return NextResponse.json({ error: "rate_limited", message: "Too many activation requests." }, { status: 429, headers: { "retry-after": "60" } });
  }

  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const parsed = activationSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const replay = await consumeNonce(route, parsed.data.nonce, parsed.data.timestamp);
  if (!replay.ok) return NextResponse.json({ error: replay.reason }, { status: replay.reason === "replayed_request" ? 409 : 400 });

  const license = await loadLicense(parsed.data.licenseKey);
  if (!license) {
    await writeApiLog({ route, method: "POST", status: 401, request, startedAt });
    return NextResponse.json({ error: "invalid_license" }, { status: 401 });
  }

  const evaluation = evaluateLicense(license, parsed.data.productSlug);
  if (!evaluation.valid) {
    await writeApiLog({ route, method: "POST", status: 403, request, startedAt, licenseId: license.id, productId: license.product_id });
    return NextResponse.json({ error: evaluation.reason }, { status: 403 });
  }

  const supabase = createAdminClient();
  const deviceHash = toBytea(sha256Hex(parsed.data.deviceFingerprint));
  const { data: existingInstallation } = await supabase
    .from("application_installations")
    .select("id, user_id, revoked_at")
    .eq("product_id", license.product_id)
    .eq("device_fingerprint_hash", deviceHash)
    .maybeSingle();

  if (existingInstallation && existingInstallation.user_id !== license.user_id) {
    return NextResponse.json({ error: "device_conflict" }, { status: 409 });
  }

  let installationId = existingInstallation?.id;
  if (installationId) {
    const { error } = await supabase.from("application_installations").update({
      device_name: parsed.data.deviceName ?? null,
      platform: parsed.data.platform,
      app_version: parsed.data.appVersion,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    }).eq("id", installationId).eq("user_id", license.user_id);
    if (error) return NextResponse.json({ error: "activation_unavailable" }, { status: 503 });
  } else {
    const { data, error } = await supabase.from("application_installations").insert({
      user_id: license.user_id,
      product_id: license.product_id,
      device_fingerprint_hash: deviceHash,
      device_name: parsed.data.deviceName ?? null,
      platform: parsed.data.platform,
      app_version: parsed.data.appVersion,
    }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "activation_unavailable" }, { status: 503 });
    installationId = data.id;
  }

  const { data: existingActivation } = await supabase
    .from("license_activations")
    .select("id")
    .eq("license_id", license.id)
    .eq("installation_id", installationId)
    .is("deactivated_at", null)
    .maybeSingle();

  if (!existingActivation) {
    const { count } = await supabase
      .from("license_activations")
      .select("*", { count: "exact", head: true })
      .eq("license_id", license.id)
      .is("deactivated_at", null);
    if ((count ?? 0) >= license.max_activations) {
      return NextResponse.json({ error: "activation_limit_reached" }, { status: 409 });
    }
  }

  const activationToken = createOpaqueToken();
  const activationValues = {
    activation_token_hash: toBytea(sha256Hex(activationToken)),
    activated_at: new Date().toISOString(),
    last_validated_at: new Date().toISOString(),
    deactivated_at: null,
    deactivation_reason: null,
    device_name: parsed.data.deviceName ?? null,
    platform: parsed.data.platform,
  };

  const activationResult = existingActivation
    ? await supabase.from("license_activations").update(activationValues).eq("id", existingActivation.id)
    : await supabase.from("license_activations").insert({ license_id: license.id, installation_id: installationId, ...activationValues });

  if (activationResult.error) return NextResponse.json({ error: "activation_unavailable" }, { status: 503 });

  await supabase.from("licenses").update({ last_validated_at: new Date().toISOString() }).eq("id", license.id);
  await supabase.from("audit_logs").insert({ actor_type: "service", action: "license.activated", target_type: "license", target_id: license.id, metadata: { installation_id: installationId } });
  await writeApiLog({ route, method: "POST", status: 201, request, startedAt, licenseId: license.id, productId: license.product_id });

  return NextResponse.json({
    activationToken,
    license: {
      status: "active",
      expiresAt: license.expires_at,
      maxActivations: license.max_activations,
      product: license.products?.slug,
      currentVersion: license.products?.current_version,
    },
  }, { status: 201, headers: { "cache-control": "no-store" } });
}
