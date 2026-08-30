import type { Metadata } from "next";
import { Download, KeyRound, PackageCheck, ShieldCheck } from "lucide-react";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = {
  title: "Customer Account",
  description: "Secure access to Driftline Tech products, entitlements, licenses, activations, releases, and downloads.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Customer account" title="One secure place for your Driftline software." description="The customer portal foundation connects purchases, entitlements, licenses, devices, releases, downloads, and support without exposing sensitive account data to the public site." />
      <section className="bg-[#f6f9fd] py-20">
        <div className="page-shell grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="section-kicker">Account capabilities</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950">Ready to expand as products become available.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [PackageCheck, "Products & entitlements", "See products your account is allowed to use."],
                [KeyRound, "Licenses & devices", "Review license status and activated installations."],
                [Download, "Secure downloads", "Access eligible release assets and current versions."],
                [ShieldCheck, "Protected access", "Server-verified sessions and row-level database policies."],
              ].map(([Icon, title, description]) => {
                const IconComponent = Icon as typeof PackageCheck;
                return <div key={title as string} className="rounded-xl border border-slate-200 bg-white p-5"><IconComponent className="size-5 text-blue-600" /><h3 className="mt-4 font-semibold text-slate-950">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description as string}</p></div>;
              })}
            </div>
          </div>
          <SignInForm />
        </div>
      </section>
    </MarketingShell>
  );
}
