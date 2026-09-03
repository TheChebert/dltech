import { NextResponse } from "next/server";

import { evaluateLicense, loadActivation, loadLicenseById } from "@/lib/api/licenses";
import { deactivationSchema } from "@/lib/api/schemas";
import { allowRequest, consumeNonce, getClientIp, sha256Hex, toBytea, writeApiLog } from "@/lib/api/security";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const route = "/api/v1/licenses/deactivate";
  const ipHash = sha256Hex(getClientIp(request));
  if (!(await allowRequest("license:deactivate:" + ipHash, 20, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  }

  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = deactivationSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const replay = await consumeNonce(route, parsed.data.nonce, parsed.data.timestamp);
  if (!replay.ok) return NextResponse.json({ error: replay.reason }, { status: replay.reason === "replayed_request" ? 409 : 400 });

  const activationLookup = await loadActivation(parsed.data.activationToken);
  if (activationLookup.unavailable) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!activationLookup.activation || activationLookup.activation.deactivated_at) return NextResponse.json({ error: "invalid_activation" }, { status: 401 });
  const licenseLookup = await loadLicenseById(activationLookup.activation.license_id);
  if (licenseLookup.unavailable) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!licenseLookup.license) return NextResponse.json({ error: "invalid_license" }, { status: 401 });
  const evaluation = evaluateLicense(licenseLookup.license, parsed.data.productId);
  if (!evaluation.valid) return NextResponse.json({ error: evaluation.reason }, { status: 403 });

  const supabase = createAdminClient();
  const { data: installation } = await supabase
    .from("application_installations")
    .select("id, device_fingerprint_hash")
    .eq("id", activationLookup.activation.installation_id)
    .maybeSingle();
  if (!installation || installation.device_fingerprint_hash !== toBytea(sha256Hex(parsed.data.installationId))) {
    return NextResponse.json({ error: "invalid_activation" }, { status: 401 });
  }

  const deactivatedAt = new Date().toISOString();
  const { error } = await supabase.from("license_activations").update({
    deactivated_at: deactivatedAt,
    deactivation_reason: parsed.data.reason ?? "user_requested",
    activation_token_hash: toBytea(sha256Hex("revoked:" + parsed.data.activationToken + ":" + deactivatedAt)),
  }).eq("id", activationLookup.activation.id);
  if (error) return NextResponse.json({ error: "deactivation_unavailable" }, { status: 503 });

  await Promise.all([
    supabase.from("audit_logs").insert({ actor_type: "service", action: "license.deactivated", target_type: "license", target_id: licenseLookup.license.id, metadata: { installation_id: installation.id } }),
    writeApiLog({ route, method: "POST", status: 200, request, startedAt, licenseId: licenseLookup.license.id, productId: licenseLookup.license.product_id }),
  ]);
  return NextResponse.json({ deactivated: true, deactivatedAt }, { headers: { "cache-control": "no-store" } });
}
