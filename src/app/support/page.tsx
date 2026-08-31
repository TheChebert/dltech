import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Download, KeyRound, LifeBuoy, RefreshCw } from "lucide-react";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Support",
  description: "Project, website, system, and ongoing service support for Driftline Tech customers.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Support" title="Find the right path for project or service help." description="For active engagements and systems supported by Driftline, share what is happening and we will help route the request to the right next step." />
      <section className="bg-[#f6f9fd] py-20">
        <div className="page-shell grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            [BookOpen, "Project documentation", "Questions about plans, handoff guidance, decisions, or materials from an active engagement.", "/contact?topic=support", "Request project help"],
            [KeyRound, "Access & account help", "Help with secure access to a website, application, or system that Driftline supports.", "/contact?topic=support", "Get account help"],
            [Download, "Updates & handoff", "Deployment, version, or handoff support for an active customer system.", "/contact?topic=support", "Request handoff help"],
            [RefreshCw, "Ongoing maintenance", "Monitoring, improvements, incident response, and planned technical care.", "/services/support-maintenance", "Explore maintenance"],
            [LifeBuoy, "Contact support", "Tell us what happened, the system involved, and the impact on your team or customers.", "/contact?topic=support", "Contact support"],
          ].map(([Icon, title, description, href, action]) => {
            const IconComponent = Icon as typeof BookOpen;
            return (
              <article key={title as string} className="flex min-h-[280px] flex-col rounded-2xl border border-slate-200 bg-white p-7">
                <IconComponent className="size-7 text-blue-600" aria-hidden="true" />
                <h2 className="mt-7 text-xl font-semibold text-slate-950">{title as string}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description as string}</p>
                <Link href={href as string} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-blue-600">{action as string} <ArrowRight className="size-4" /></Link>
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
            {["System, page, or workflow", "Operating system or browser", "What you expected", "What happened instead", "Steps already tried", "Screenshots without private information"].map((item) => <li key={item} className="flex gap-3 rounded-xl bg-slate-50 p-4"><span className="mt-2 size-1.5 rounded-full bg-blue-600" />{item}</li>)}
          </ul>
        </div>
      </section>
    </MarketingShell>
  );
}
