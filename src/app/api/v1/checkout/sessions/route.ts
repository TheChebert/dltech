import { NextResponse } from "next/server";

import { checkoutSchema } from "@/lib/api/schemas";
import { allowRequest, getClientIp, sha256Hex } from "@/lib/api/security";
import { createPendingOrder } from "@/lib/commerce/orders";
import { getStripe, getStripeEnvironment } from "@/lib/commerce/stripe";
import { verifyStripePriceMapping } from "@/lib/commerce/verification";
import { getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ipHash = sha256Hex(getClientIp(request));
  if (!(await allowRequest("checkout:create:" + ipHash, 10, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  }
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: product, error: productError } = await supabase.from("products").select("id, slug, name").eq("slug", parsed.data.productId).eq("status", "available").maybeSingle();
  if (productError) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!product) return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
  const { data: edition, error: editionError } = await supabase.from("product_editions").select("id, code, name, activation_required").eq("product_id", product.id).eq("code", parsed.data.editionId).eq("active", true).maybeSingle();
  if (editionError) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!edition || !edition.activation_required) return NextResponse.json({ error: "checkout_not_required" }, { status: 409 });

  let environment: "test" | "live";
  try { environment = getStripeEnvironment(); } catch { return NextResponse.json({ error: "commerce_configuration_invalid" }, { status: 503 }); }
  const { data: price, error: priceError } = await supabase
    .from("product_prices")
    .select("id, provider_price_id, provider_product_id, currency, amount_minor, billing_interval")
    .eq("edition_id", edition.id)
    .eq("provider", "stripe")
    .eq("environment", environment)
    .eq("active", true)
    .eq("is_default", true)
    .maybeSingle();
  if (priceError) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  if (!price?.provider_price_id || !price.provider_product_id) {
    return NextResponse.json({ error: "stripe_price_not_configured" }, { status: 503 });
  }
  if (price.billing_interval !== "one_time") return NextResponse.json({ error: "price_configuration_invalid" }, { status: 503 });

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
    const providerPrice = await stripe.prices.retrieve(price.provider_price_id);
    const providerProductId = typeof providerPrice.product === "string" ? providerPrice.product : providerPrice.product.id;
    verifyStripePriceMapping({ active: providerPrice.active, currency: providerPrice.currency, unitAmount: providerPrice.unit_amount, type: providerPrice.type, productId: providerProductId }, { currency: price.currency, amountMinor: price.amount_minor, productId: price.provider_product_id });
  } catch (error) {
    console.error("stripe_price_mapping_failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "stripe_price_mapping_invalid" }, { status: 503 });
  }

  let order: Awaited<ReturnType<typeof createPendingOrder>>;
  try {
    order = await createPendingOrder({
      provider: "stripe",
      productId: product.slug,
      editionId: edition.code,
      productUuid: product.id,
      editionUuid: edition.id,
      productPriceId: price.id,
      currency: price.currency,
      amountMinor: price.amount_minor,
    });
  } catch (error) {
    console.error("checkout_order_failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 503 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      client_reference_id: order.orderId,
      line_items: [{ price: price.provider_price_id, quantity: 1 }],
      metadata: { order_id: order.orderId, product_id: product.slug, edition_id: edition.code },
      payment_intent_data: { metadata: { order_id: order.orderId, product_id: product.slug, edition_id: edition.code } },
      success_url: getSiteUrl() + "/checkout/success?order_id=" + order.orderId,
      cancel_url: getSiteUrl() + "/software/" + product.slug + "?checkout=cancelled",
    }, { idempotencyKey: "checkout-order-" + order.orderId });
    if (!session.url) throw new Error("checkout_url_missing");
    const { error: updateError } = await supabase.from("orders").update({ provider_order_id: session.id, metadata: { product_id: product.slug, edition_id: edition.code, stripe_environment: environment } }).eq("id", order.orderId);
    if (updateError) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      throw new Error("checkout_order_update_failed");
    }
    return NextResponse.json({ checkoutUrl: session.url, orderId: order.orderId, accessToken: order.accessToken }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    await supabase.from("orders").update({ status: "failed", metadata: { checkout_error: "stripe_session_create" } }).eq("id", order.orderId);
    console.error("stripe_checkout_failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 503 });
  }
}
