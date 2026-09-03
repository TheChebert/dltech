"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

export function CheckoutButton({ productId, editionId, configured }: { productId: string; editionId: string; configured: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function beginCheckout() {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/v1/checkout/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, editionId }) });
      const data = await response.json() as { checkoutUrl?: string; orderId?: string; accessToken?: string; error?: string };
      if (!response.ok || !data.checkoutUrl || !data.orderId || !data.accessToken) throw new Error(data.error || "checkout_unavailable");
      sessionStorage.setItem("driftline_checkout_" + data.orderId, data.accessToken);
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error && error.message === "stripe_price_not_configured" ? "Stripe Test Mode pricing still needs to be connected." : "Checkout is temporarily unavailable. Please try again.");
    }
  }

  return <div><button type="button" disabled={!configured || state === "loading"} onClick={beginCheckout} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300">{state === "loading" ? <><LoaderCircle className="size-4 animate-spin" /> Opening secure checkout</> : configured ? "Buy with Stripe" : "Stripe setup required"}</button>{state === "error" ? <p role="alert" className="mt-3 text-sm text-rose-700">{message}</p> : null}<p className="mt-3 text-center text-xs text-slate-500">Secure payment is handled by Stripe.</p></div>;
}
