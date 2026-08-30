import { NextResponse } from "next/server";

import { evaluateLicense, loadLicense } from "@/lib/api/licenses";
import { validationSchema } from "@/lib/api/schemas";
import { allowRequest, consumeNonce, getClientIp, sha256Hex, toBytea, writeApiLog } from "@/lib/api/security";
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

  const license = await loadLicense(parsed.data.licenseKey);
  if (!license) return NextResponse.json({ valid: false, error: "invalid_license" }, { status: 401, headers: { "cache-control": "no-store" } });

  const evaluation = evaluateLicense(license, parsed.data.productSlug);
  if (!evaluation.valid) return NextResponse.json({ valid: false, error: evaluation.reason }, { status: 403, headers: { "cache-control": "no-store" } });

  const supabase = createAdminClient();
  const deviceHash = toBytea(sha256Hex(parsed.data.deviceFingerprint));
  const tokenHash = toBytea(sha256Hex(parsed.data.activationToken));

  const { data: activation } = await supabase
    .from("license_activations")
    .select("id, installation_id, application_installations!inner(device_fingerprint_hash, revoked_at)")
    .eq("license_id", license.id)
    .eq("activation_token_hash", tokenHash)
    .is("deactivated_at", null)
    .maybeSingle();

  const installation = Array.isArray(activation?.application_installations) ? activation?.application_installations[0] : activation?.application_installations;
  if (!activation || !installation || installation.device_fingerprint_hash !== deviceHash || installation.revoked_at) {
    await writeApiLog({ route, method: "POST", status: 401, request, startedAt, licenseId: license.id, productId: license.product_id });
    return NextResponse.json({ valid: false, error: "invalid_activation" }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const validatedAt = new Date().toISOString();
  await Promise.all([
    supabase.from("license_activations").update({ last_validated_at: validatedAt }).eq("id", activation.id),
    supabase.from("application_installations").update({ last_seen_at: validatedAt, app_version: parsed.data.appVersion }).eq("id", activation.installation_id),
    supabase.from("licenses").update({ last_validated_at: validatedAt }).eq("id", license.id),
  ]);

  const { data: latest } = await supabase
    .from("product_versions")
    .select("version, minimum_supported_version, critical, release_notes, published_at")
    .eq("product_id", license.product_id)
    .eq("channel", "stable")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await writeApiLog({ route, method: "POST", status: 200, request, startedAt, licenseId: license.id, productId: license.product_id });

  return NextResponse.json({
    valid: true,
    validatedAt,
    license: {
      status: license.status,
      expiresAt: license.expires_at,
      versionPolicy: license.entitlements?.version_policy,
    },
    update: latest ? {
      latestVersion: latest.version,
      minimumSupportedVersion: latest.minimum_supported_version,
      critical: latest.critical,
      releaseNotes: latest.release_notes,
      publishedAt: latest.published_at,
    } : null,
  }, { headers: { "cache-control": "no-store" } });
}
