import { NextResponse } from "next/server";

import { evaluateLicense, loadLicense } from "@/lib/api/licenses";
import { deactivationSchema } from "@/lib/api/schemas";
import { consumeNonce, sha256Hex, toBytea, writeApiLog } from "@/lib/api/security";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const route = "/api/v1/licenses/deactivate";
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = deactivationSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const replay = await consumeNonce(route, parsed.data.nonce, parsed.data.timestamp);
  if (!replay.ok) return NextResponse.json({ error: replay.reason }, { status: replay.reason === "replayed_request" ? 409 : 400 });

  const license = await loadLicense(parsed.data.licenseKey);
  if (!license) return NextResponse.json({ error: "invalid_license" }, { status: 401 });
  const evaluation = evaluateLicense(license, parsed.data.productSlug);
  if (!evaluation.valid) return NextResponse.json({ error: evaluation.reason }, { status: 403 });

  const supabase = createAdminClient();
  const deviceHash = toBytea(sha256Hex(parsed.data.deviceFingerprint));
  const tokenHash = toBytea(sha256Hex(parsed.data.activationToken));
  const { data: activation } = await supabase
    .from("license_activations")
    .select("id, installation_id, application_installations!inner(device_fingerprint_hash)")
    .eq("license_id", license.id)
    .eq("activation_token_hash", tokenHash)
    .is("deactivated_at", null)
    .maybeSingle();

  const installation = Array.isArray(activation?.application_installations) ? activation?.application_installations[0] : activation?.application_installations;
  if (!activation || !installation || installation.device_fingerprint_hash !== deviceHash) {
    return NextResponse.json({ error: "invalid_activation" }, { status: 401 });
  }

  const deactivatedAt = new Date().toISOString();
  const { error } = await supabase.from("license_activations").update({
    deactivated_at: deactivatedAt,
    deactivation_reason: parsed.data.reason ?? "user_requested",
    activation_token_hash: toBytea(sha256Hex("revoked:" + parsed.data.activationToken + ":" + deactivatedAt)),
  }).eq("id", activation.id);

  if (error) return NextResponse.json({ error: "deactivation_unavailable" }, { status: 503 });

  await supabase.from("audit_logs").insert({ actor_type: "service", action: "license.deactivated", target_type: "license", target_id: license.id, metadata: { installation_id: activation.installation_id } });
  await writeApiLog({ route, method: "POST", status: 200, request, startedAt, licenseId: license.id, productId: license.product_id });

  return NextResponse.json({ deactivated: true, deactivatedAt }, { headers: { "cache-control": "no-store" } });
}
