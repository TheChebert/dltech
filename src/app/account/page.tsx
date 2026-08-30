import type { Metadata } from "next";
import { FolderLock, LifeBuoy, ShieldCheck, UsersRound } from "lucide-react";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = {
  title: "Customer Account",
  description: "Secure access for invited Driftline Tech customers.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Customer account" title="Secure access for invited customers." description="This private area supports customer access without exposing account or engagement information on the public site." />
      <section className="bg-[#f6f9fd] py-20">
        <div className="page-shell grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="section-kicker">Protected customer access</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950">Built for private resources and ongoing support.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [UsersRound, "Invited customers", "Access is limited to accounts approved by Driftline Tech."],
                [FolderLock, "Protected resources", "Customer materials remain behind server-verified access controls."],
                [LifeBuoy, "Support continuity", "Keep customer access and support pathways connected over time."],
                [ShieldCheck, "Protected access", "Server-verified sessions and row-level database policies."],
              ].map(([Icon, title, description]) => {
                const IconComponent = Icon as typeof UsersRound;
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