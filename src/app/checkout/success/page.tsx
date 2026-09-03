import type { Metadata } from "next";

import { CheckoutResult } from "@/components/checkout-result";
import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = { title: "Checkout status", robots: { index: false, follow: false } };

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order_id?: string }> }) {
  const orderId = (await searchParams).order_id;
  return <MarketingShell><InnerHero eyebrow="Secure fulfillment" title="Thanks for your purchase." description="Driftline is confirming the verified Stripe event and preparing your entitlement." /><section className="surface-light py-20"><div className="page-shell max-w-3xl">{orderId ? <CheckoutResult orderId={orderId} /> : <p className="rounded-2xl border border-amber-200 bg-amber-50 p-7 text-amber-950">The checkout order reference is missing.</p>}</div></section></MarketingShell>;
}
