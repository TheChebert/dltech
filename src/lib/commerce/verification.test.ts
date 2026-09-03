import { describe, expect, it } from "vitest";

import { verifyCheckoutConsistency, verifyStripePriceMapping, type CheckoutVerification } from "@/lib/commerce/verification";

const valid: CheckoutVerification = {
  session: {
    mode: "payment",
    paymentStatus: "paid",
    sessionId: "cs_test_123",
    currency: "usd",
    amountTotal: 1499,
    productId: "metatweak",
    editionId: "pro",
    lineItemCount: 1,
    lineQuantity: 1,
    linePriceId: "price_test_123",
    lineProductId: "prod_test_123",
  },
  expected: {
    sessionId: "cs_test_123",
    currency: "USD",
    amountTotal: 1499,
    productId: "metatweak",
    editionId: "pro",
    priceId: "price_test_123",
    providerProductId: "prod_test_123",
    environment: "test",
    activeEnvironment: "test",
  },
};

describe("Stripe checkout reconciliation", () => {
  it("accepts the exact configured order, item, and environment", () => {
    expect(() => verifyCheckoutConsistency(valid)).not.toThrow();
  });

  it.each([
    ["amount", { session: { ...valid.session, amountTotal: 99 } }, "checkout_amount_mismatch"],
    ["price", { session: { ...valid.session, linePriceId: "price_attacker" } }, "checkout_price_mismatch"],
    ["product mapping", { session: { ...valid.session, lineProductId: "prod_other" } }, "checkout_product_mismatch"],
    ["edition metadata", { session: { ...valid.session, editionId: "free" } }, "checkout_metadata_mismatch"],
    ["payment state", { session: { ...valid.session, paymentStatus: "unpaid" } }, "checkout_not_paid"],
    ["environment", { expected: { ...valid.expected, environment: "live" } }, "checkout_environment_mismatch"],
  ])("rejects a mismatched %s", (_name, change, message) => {
    const input = { session: valid.session, expected: valid.expected, ...change } as CheckoutVerification;
    expect(() => verifyCheckoutConsistency(input)).toThrow(message);
  });
});

describe("Stripe price mapping", () => {
  const expected = { currency: "USD", amountMinor: 1499, productId: "prod_test_123" };
  it("accepts the active one-time Stripe price that matches platform configuration", () => {
    expect(() => verifyStripePriceMapping({ active: true, currency: "usd", unitAmount: 1499, type: "one_time", productId: "prod_test_123" }, expected)).not.toThrow();
  });
  it.each([
    { active: false, currency: "usd", unitAmount: 1499, type: "one_time", productId: "prod_test_123" },
    { active: true, currency: "usd", unitAmount: 999, type: "one_time", productId: "prod_test_123" },
    { active: true, currency: "usd", unitAmount: 1499, type: "recurring", productId: "prod_test_123" },
    { active: true, currency: "usd", unitAmount: 1499, type: "one_time", productId: "prod_other" },
  ])("rejects a mismatched Stripe price", (actual) => {
    expect(() => verifyStripePriceMapping(actual, expected)).toThrow("stripe_price_mapping_invalid");
  });
});
