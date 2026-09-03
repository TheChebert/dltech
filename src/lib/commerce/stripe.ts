import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeEnvironment() {
  const value = process.env.STRIPE_ENVIRONMENT || "test";
  if (value !== "test" && value !== "live") throw new Error("STRIPE_ENVIRONMENT must be test or live.");
  return value;
}
export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing required server environment variable: STRIPE_SECRET_KEY");
  const environment = getStripeEnvironment();
  if (environment === "test" && !secretKey.startsWith("sk_test_")) throw new Error("Stripe Test Mode requires an sk_test_ key.");
  if (environment === "live" && !secretKey.startsWith("sk_live_")) throw new Error("Stripe Live Mode requires an sk_live_ key.");
  stripeClient ||= new Stripe(secretKey, { appInfo: { name: "Driftline Platform", version: "1.0.0" } });
  return stripeClient;
}
export function getStripeWebhookSecret() {
  const value = process.env.STRIPE_WEBHOOK_SECRET;
  if (!value) throw new Error("Missing required server environment variable: STRIPE_WEBHOOK_SECRET");
  return value;
}
