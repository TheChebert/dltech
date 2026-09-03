export type CheckoutVerification = {
  session: {
    mode: string | null;
    paymentStatus: string;
    sessionId: string;
    currency: string | null;
    amountTotal: number | null;
    productId: string | undefined;
    editionId: string | undefined;
    lineItemCount: number;
    lineQuantity: number | null | undefined;
    linePriceId: string | null | undefined;
    lineProductId: string | null;
  };
  expected: {
    sessionId: string;
    currency: string;
    amountTotal: number;
    productId: unknown;
    editionId: unknown;
    priceId: string | null;
    providerProductId: string | null;
    environment: string;
    activeEnvironment: string;
  };
};

export function verifyCheckoutConsistency({ session, expected }: CheckoutVerification) {
  if (session.mode !== "payment") throw new Error("checkout_mode_invalid");
  if (session.paymentStatus !== "paid" && session.paymentStatus !== "no_payment_required") throw new Error("checkout_not_paid");
  if (session.sessionId !== expected.sessionId) throw new Error("checkout_session_mismatch");
  if (session.productId !== expected.productId || session.editionId !== expected.editionId) throw new Error("checkout_metadata_mismatch");
  if (session.currency?.toUpperCase() !== expected.currency || session.amountTotal !== expected.amountTotal) throw new Error("checkout_amount_mismatch");
  if (session.lineItemCount !== 1 || session.lineQuantity !== 1 || !expected.priceId || session.linePriceId !== expected.priceId) throw new Error("checkout_price_mismatch");
  if (!expected.providerProductId || session.lineProductId !== expected.providerProductId) throw new Error("checkout_product_mismatch");
  if (expected.environment !== expected.activeEnvironment) throw new Error("checkout_environment_mismatch");
}

export function verifyStripePriceMapping(actual: {
  active: boolean;
  currency: string;
  unitAmount: number | null;
  type: string;
  productId: string | null;
}, expected: {
  currency: string;
  amountMinor: number;
  productId: string;
}) {
  if (!actual.active || actual.type !== "one_time" || actual.currency.toUpperCase() !== expected.currency || actual.unitAmount !== expected.amountMinor || actual.productId !== expected.productId) {
    throw new Error("stripe_price_mapping_invalid");
  }
}
