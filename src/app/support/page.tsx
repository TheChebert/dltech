import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Download, KeyRound, LifeBuoy, RefreshCw } from "lucide-react";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Support",
  description: "Product help, account and license support, documentation, downloads, and contact options for Driftline Tech customers.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Support" title="Find the right path for product, account, or project help." description="The support platform is ready to grow with Driftline products. Public documentation and customer-only resources will be added as products move toward release." />
      <section className="bg-[#f6f9fd] py-20">
        <div className="page-shell grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            [BookOpen, "Documentation", "Product setup, workflows, integrations, and release information.", "/software"],
            [KeyRound, "Account & licensing", "Access purchased products, entitlements, licenses, and activated devices.", "/account"],
            [Download, "Downloads & updates", "Secure release downloads and current version information for entitled customers.", "/account"],
            [RefreshCw, "Release information", "Version notes, supported channels, and minimum supported releases.", "/software"],
            [LifeBuoy, "Contact support", "Tell us what happened, the product or system involved, and the impact.", "/contact?topic=support"],
          ].map(([Icon, title, description, href]) => {
            const IconComponent = Icon as typeof BookOpen;
            return (
              <article key={title as string} className="flex min-h-[280px] flex-col rounded-2xl border border-slate-200 bg-white p-7">
                <IconComponent className="size-7 text-blue-600" aria-hidden="true" />
                <h2 className="mt-7 text-xl font-semibold text-slate-950">{title as string}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description as string}</p>
                <Link href={href as string} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-blue-600">Open resource <ArrowRight className="size-4" /></Link>
              </article>
            );
          })}
        </div>
      </section>
      <section className="bg-white py-20">
        <div className="page-shell rounded-2xl border border-slate-200 p-8 sm:p-12">
          <p className="section-kicker">Before submitting a support request</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Include enough context to reproduce the problem.</h2>
          <ul className="mt-8 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2">
            {["Product and version", "Operating system or browser", "What you expected", "What happened instead", "Steps already tried", "Screenshots without private information"].map((item) => <li key={item} className="flex gap-3 rounded-xl bg-slate-50 p-4"><span className="mt-2 size-1.5 rounded-full bg-blue-600" />{item}</li>)}
          </ul>
        </div>
      </section>
    </MarketingShell>
  );
}
