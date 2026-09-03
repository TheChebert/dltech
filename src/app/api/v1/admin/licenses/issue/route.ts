import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { manualIssueSchema } from "@/lib/api/schemas";
import { secretsEqual } from "@/lib/api/security";
import { createLicenseMaterial, createPendingOrder, fulfillOrder } from "@/lib/commerce/orders";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configuredKey = process.env.DRIFTLINE_ADMIN_API_KEY;
  const providedKey = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configuredKey || !providedKey || !secretsEqual(configuredKey, providedKey)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = manualIssueSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: product } = await supabase.from("products").select("id, slug").eq("slug", parsed.data.productId).eq("status", "available").maybeSingle();
  if (!product) return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
  const { data: edition } = await supabase.from("product_editions").select("id, code, activation_required").eq("product_id", product.id).eq("code", parsed.data.editionId).eq("active", true).maybeSingle();
  if (!edition || !edition.activation_required) return NextResponse.json({ error: "edition_unavailable" }, { status: 404 });

  try {
    const order = await createPendingOrder({
      provider: "manual",
      productId: product.slug,
      editionId: edition.code,
      productUuid: product.id,
      editionUuid: edition.id,
      currency: "USD",
      amountMinor: 0,
      customerEmail: parsed.data.customerEmail,
    });
    const material = createLicenseMaterial();
    const result = await fulfillOrder({
      orderId: order.orderId,
      customerEmail: parsed.data.customerEmail,
      providerCustomerId: null,
      providerPaymentId: "manual:" + randomUUID(),
      providerCheckoutId: null,
      currency: "USD",
      amountMinor: 0,
      material,
    });
    return NextResponse.json({ orderId: order.orderId, licenseId: result.license_id, licenseKey: material.licenseKey }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("manual_license_issue_failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "issuance_unavailable" }, { status: 503 });
  }
}
