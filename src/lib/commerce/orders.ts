import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { sha256Hex, toBytea } from "@/lib/api/security";
import { decryptLicenseKey, encryptLicenseKey } from "@/lib/licensing/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function createLicenseMaterial() {
  const licenseKey = "DLT1_" + randomBytes(32).toString("base64url");
  const encryptionKey = process.env.DRIFTLINE_LICENSE_KEY_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("Missing required server environment variable: DRIFTLINE_LICENSE_KEY_ENCRYPTION_KEY");
  return {
    licenseKey,
    keyPrefix: licenseKey.slice(0, 13),
    keyHash: toBytea(sha256Hex(licenseKey)),
    keyCiphertext: encryptLicenseKey(licenseKey, encryptionKey),
  };
}
export function recoverLicenseKey(ciphertext: string) {
  const encryptionKey = process.env.DRIFTLINE_LICENSE_KEY_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("Missing required server environment variable: DRIFTLINE_LICENSE_KEY_ENCRYPTION_KEY");
  return decryptLicenseKey(ciphertext, encryptionKey);
}
export function createCheckoutAccess() {
  const accessToken = randomBytes(32).toString("base64url");
  return { accessToken, accessTokenHash: toBytea(sha256Hex(accessToken)) };
}

export async function fulfillOrder(input: {
  orderId: string;
  customerEmail: string;
  providerCustomerId: string | null;
  providerPaymentId: string;
  providerCheckoutId: string | null;
  currency: string;
  amountMinor: number;
  material: ReturnType<typeof createLicenseMaterial>;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("fulfill_commerce_order", {
    p_amount_minor: input.amountMinor,
    p_currency: input.currency.toUpperCase(),
    p_customer_email: input.customerEmail,
    p_license_key_ciphertext: input.material.keyCiphertext,
    p_license_key_hash: input.material.keyHash,
    p_license_key_prefix: input.material.keyPrefix,
    p_order_id: input.orderId,
    p_provider_checkout_id: input.providerCheckoutId,
    p_provider_customer_id: input.providerCustomerId,
    p_provider_payment_id: input.providerPaymentId,
  });
  if (error) throw new Error("order_fulfillment_failed:" + error.code);
  return data as { order_id: string; customer_id: string; entitlement_id: string; license_id: string | null; already_fulfilled: boolean };
}

export async function createPendingOrder(input: {
  provider: "stripe" | "manual";
  productId: string;
  editionId: string;
  productUuid: string;
  editionUuid: string;
  productPriceId?: string | null;
  currency: string;
  amountMinor: number;
  customerEmail?: string | null;
}) {
  const supabase = createAdminClient();
  const orderId = randomUUID();
  const access = createCheckoutAccess();
  const providerOrderId = input.provider === "stripe" ? "pending:" + orderId : "manual:" + randomUUID();
  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    provider: input.provider,
    provider_order_id: providerOrderId,
    status: "pending",
    currency: input.currency.toUpperCase(),
    subtotal_minor: input.amountMinor,
    total_minor: input.amountMinor,
    customer_email: input.customerEmail ?? null,
    checkout_access_token_hash: access.accessTokenHash,
    metadata: { product_id: input.productId, edition_id: input.editionId },
  });
  if (orderError) throw new Error("order_create_failed:" + orderError.code);

  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: orderId,
    product_id: input.productUuid,
    edition_id: input.editionUuid,
    product_price_id: input.productPriceId ?? null,
    quantity: 1,
    unit_amount_minor: input.amountMinor,
    total_amount_minor: input.amountMinor,
  });
  if (itemError) {
    await supabase.from("orders").update({ status: "failed", metadata: { create_error: "order_item" } }).eq("id", orderId);
    throw new Error("order_item_create_failed:" + itemError.code);
  }
  return { orderId, ...access, providerOrderId };
}
