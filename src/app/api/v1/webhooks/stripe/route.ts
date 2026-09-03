import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { sha256Hex } from "@/lib/api/security";
import { createLicenseMaterial, fulfillOrder } from "@/lib/commerce/orders";
import { getStripe, getStripeEnvironment, getStripeWebhookSecret } from "@/lib/commerce/stripe";
import { verifyCheckoutConsistency } from "@/lib/commerce/verification";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function setEventStatus(eventId: string, status: "processed" | "failed" | "ignored", error?: string) {
  const supabase = createAdminClient();
  await supabase.from("webhook_events").update({
    status,
    last_error: error?.slice(0, 500) ?? null,
    processed_at: status === "processed" || status === "ignored" ? new Date().toISOString() : null,
    locked_at: null,
  }).eq("provider", "stripe").eq("provider_event_id", eventId);
}

function objectId(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function fulfillCheckout(sessionInput: Stripe.Checkout.Session) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionInput.id, { expand: ["line_items.data.price"] });
  const orderId = session.metadata?.order_id || session.client_reference_id;
  if (!orderId || session.client_reference_id !== orderId) throw new Error("checkout_order_reference_invalid");

  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, provider_order_id, currency, total_minor, status, metadata")
    .eq("id", orderId)
    .eq("provider", "stripe")
    .maybeSingle();
  if (orderError || !order) throw new Error("checkout_order_not_found");

  const { data: orderItem } = await supabase
    .from("order_items")
    .select("id, product_price_id, quantity")
    .eq("order_id", order.id)
    .limit(1)
    .maybeSingle();
  if (!orderItem?.product_price_id || orderItem.quantity !== 1) throw new Error("checkout_item_invalid");
  const { data: configuredPrice } = await supabase
    .from("product_prices")
    .select("provider_price_id, provider_product_id, environment")
    .eq("id", orderItem.product_price_id)
    .maybeSingle();
  const lineItems = session.line_items?.data ?? [];
  const linePrice = lineItems[0]?.price;
  const linePriceId = typeof linePrice === "string" ? linePrice : linePrice?.id;
  const lineProductId = typeof linePrice === "string" ? null : objectId(linePrice?.product ?? null);
  verifyCheckoutConsistency({
    session: {
      mode: session.mode,
      paymentStatus: session.payment_status,
      sessionId: session.id,
      currency: session.currency,
      amountTotal: session.amount_total,
      productId: session.metadata?.product_id,
      editionId: session.metadata?.edition_id,
      lineItemCount: lineItems.length,
      lineQuantity: lineItems[0]?.quantity,
      linePriceId,
      lineProductId,
    },
    expected: {
      sessionId: order.provider_order_id,
      currency: order.currency,
      amountTotal: order.total_minor,
      productId: order.metadata?.product_id,
      editionId: order.metadata?.edition_id,
      priceId: configuredPrice?.provider_price_id ?? null,
      providerProductId: configuredPrice?.provider_product_id ?? null,
      environment: configuredPrice?.environment ?? "missing",
      activeEnvironment: getStripeEnvironment(),
    },
  });

  const customerEmail = session.customer_details?.email || session.customer_email;
  if (!customerEmail) throw new Error("checkout_customer_email_missing");
  const material = createLicenseMaterial();
  return fulfillOrder({
    orderId: order.id,
    customerEmail,
    providerCustomerId: objectId(session.customer),
    providerPaymentId: objectId(session.payment_intent) || session.id,
    providerCheckoutId: session.id,
    currency: session.currency || order.currency,
    amountMinor: session.amount_total ?? order.total_minor,
    material,
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "signature_required" }, { status: 400 });
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const environment = getStripeEnvironment();
  if (event.livemode !== (environment === "live")) return NextResponse.json({ error: "environment_mismatch" }, { status: 400 });
  const supabase = createAdminClient();
  const { data: claim, error: claimError } = await supabase.rpc("claim_webhook_event", {
    p_event_type: event.type,
    p_payload_sha256: sha256Hex(payload),
    p_provider: "stripe",
    p_provider_event_id: event.id,
  });
  if (claimError) return NextResponse.json({ error: "webhook_unavailable" }, { status: 503 });
  if (claim === "payload_mismatch") return NextResponse.json({ error: "event_conflict" }, { status: 409 });
  if (claim === "already_processed" || claim === "already_processing") return NextResponse.json({ received: true, duplicate: true });
  if (claim !== "claimed") return NextResponse.json({ error: "webhook_unavailable" }, { status: 503 });

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (event.type === "checkout.session.completed" && session.payment_status === "unpaid") {
        await setEventStatus(event.id, "processed");
        return NextResponse.json({ received: true, pending: true });
      }
      await fulfillCheckout(session);
      await setEventStatus(event.id, "processed");
      return NextResponse.json({ received: true });
    }
    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id || session.client_reference_id;
      if (orderId) await supabase.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
      await setEventStatus(event.id, "processed");
      return NextResponse.json({ received: true });
    }
    await setEventStatus(event.id, "ignored");
    return NextResponse.json({ received: true, ignored: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook_processing_failed";
    console.error("stripe_webhook_failed", { eventId: event.id, message });
    await setEventStatus(event.id, "failed", message);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}
