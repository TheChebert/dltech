"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Result = { state: "loading" } | { state: "pending" } | { state: "complete"; licenseKey: string } | { state: "error"; message: string };

export function CheckoutResult({ orderId }: { orderId: string }) {
  const [result, setResult] = useState<Result>({ state: "loading" });
  useEffect(() => {
    const accessToken = sessionStorage.getItem("driftline_checkout_" + orderId);
    if (!accessToken) {
      const timeoutId = window.setTimeout(() => setResult({ state: "error", message: "This browser no longer has the secure checkout receipt. Contact support with your order reference." }), 0);
      return () => window.clearTimeout(timeoutId);
    }
    let cancelled = false;
    let attempts = 0;
    async function check() {
      attempts += 1;
      try {
        const response = await fetch("/api/v1/checkout/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, accessToken }) });
        const data = await response.json() as { fulfilled?: boolean; licenseKey?: string };
        if (cancelled) return;
        if (response.ok && data.fulfilled && data.licenseKey) {
          setResult({ state: "complete", licenseKey: data.licenseKey });
          return;
        }
        if (response.ok && attempts < 30) {
          setResult({ state: "pending" });
          window.setTimeout(check, 2000);
          return;
        }
        setResult({ state: "error", message: "Payment was received, but fulfillment is still processing. Save the order reference and contact support if it does not appear shortly." });
      } catch {
        if (!cancelled && attempts < 30) window.setTimeout(check, 2000);
        else if (!cancelled) setResult({ state: "error", message: "Unable to check fulfillment right now. Please try this page again." });
      }
    }
    void check();
    return () => { cancelled = true; };
  }, [orderId]);

  if (result.state === "complete") return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7"><CheckCircle2 className="size-9 text-emerald-600" /><h2 className="mt-4 text-2xl font-semibold text-emerald-950">Your license is ready</h2><p className="mt-3 text-sm text-emerald-900">Store this key securely. The product will use it only for initial activation.</p><code className="mt-5 block break-all rounded-lg bg-white p-4 text-sm text-slate-950 shadow-inner">{result.licenseKey}</code></div>;
  if (result.state === "error") return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7"><h2 className="text-xl font-semibold text-amber-950">We could not display the license yet</h2><p className="mt-3 text-sm leading-6 text-amber-900">{result.message}</p></div>;
  return <div className="flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-7 text-blue-950"><LoaderCircle className="size-7 animate-spin text-blue-600" /><div><h2 className="font-semibold">Verifying payment and issuing your license</h2><p className="mt-1 text-sm">This page waits for verified fulfillment; the redirect itself never grants access.</p></div></div>;
}
