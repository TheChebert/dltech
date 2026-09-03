import { NextResponse } from "next/server";

import { freeEntitlementSchema } from "@/lib/api/schemas";
import { allowRequest, getClientIp, sha256Hex } from "@/lib/api/security";
import { getEntitlementJwks, issueEntitlementToken, loadEditionEntitlement } from "@/lib/licensing/entitlements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ipHash = sha256Hex(getClientIp(request));
  if (!(await allowRequest("entitlement:free:" + ipHash, 120, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  }
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = freeEntitlementSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    const edition = await loadEditionEntitlement(parsed.data.productId, parsed.data.editionId);
    if (!edition || edition.activation_required) return NextResponse.json({ error: "edition_unavailable" }, { status: 404 });
    const issued = issueEntitlementToken({ edition });
    return NextResponse.json({ entitlementToken: issued.token, entitlement: issued.payload, verificationKeys: getEntitlementJwks() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("free_entitlement_failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
