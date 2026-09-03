import { NextResponse } from "next/server";

import { checkoutStatusSchema } from "@/lib/api/schemas";
import { allowRequest, getClientIp, sha256Hex, toBytea } from "@/lib/api/security";
import { recoverLicenseKey } from "@/lib/commerce/orders";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ipHash = sha256Hex(getClientIp(request));
  if (!(await allowRequest("checkout:status:" + ipHash, 120, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  }
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = checkoutStatusSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, status, completed_at")
    .eq("id", parsed.data.orderId)
    .eq("checkout_access_token_hash", toBytea(sha256Hex(parsed.data.accessToken)))
    .maybeSingle();
  if (error) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.status !== "paid") return NextResponse.json({ status: order.status, fulfilled: false }, { headers: { "cache-control": "no-store" } });

  const { data: item } = await supabase.from("order_items").select("id").eq("order_id", order.id).limit(1).maybeSingle();
  const { data: entitlement } = item ? await supabase.from("entitlements").select("id").eq("order_item_id", item.id).maybeSingle() : { data: null };
  const { data: license } = entitlement ? await supabase.from("licenses").select("key_ciphertext").eq("entitlement_id", entitlement.id).maybeSingle() : { data: null };
  if (!license?.key_ciphertext) return NextResponse.json({ error: "fulfillment_incomplete" }, { status: 503 });
  try {
    return NextResponse.json({ status: order.status, fulfilled: true, completedAt: order.completed_at, licenseKey: recoverLicenseKey(license.key_ciphertext) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "fulfillment_incomplete" }, { status: 503 });
  }
}
