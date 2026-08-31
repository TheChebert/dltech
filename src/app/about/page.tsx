import type { Metadata } from "next";
import { Eye, Layers3, Scale, ShieldCheck } from "lucide-react";

import { CtaBand } from "@/components/cta-band";
import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "About",
  description: "Learn how Driftline Tech approaches custom software, websites, automation, and long-term system ownership.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="About Driftline" title="A technology company built around useful systems and clear ownership." description="Driftline Tech helps businesses design, build, connect, and support digital systems. The work stays grounded in what it takes to operate and improve technology after launch." />
      <section className="surface-light py-20 sm:py-24">
        <div className="page-shell grid gap-12 lg:grid-cols-2">
          <div>
            <p className="section-kicker">Our point of view</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950">The interface matters. So do the permissions, data, releases, support, and recovery behind it.</h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-slate-600">
            <p>We approach websites as business systems, custom applications as long-lived tools, and automation as software that needs clear ownership and dependable failure handling.</p>
            <p>That means making design quality, security, performance, maintainability, documentation, and deployment reliability part of the same conversation.</p>
            <p>You get a clear view of what is proven, what is assumed, and which decision comes next. That protects trust, keeps priorities visible, and prevents avoidable rework.</p>
          </div>
        </div>
      </section>
      <section className="surface-light-alt py-20">
        <div className="page-shell grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            [Eye, "Clarity", "Make the problem, tradeoffs, state, and next decision visible."],
            [Scale, "Proportion", "Use enough architecture for the risk without making the solution heavier than it needs to be."],
            [ShieldCheck, "Responsibility", "Treat security, accessibility, privacy, and recovery as delivery requirements."],
            [Layers3, "Continuity", "Design work so another capable person can understand, operate, and extend it."],
          ].map(([Icon, title, description]) => {
            const IconComponent = Icon as typeof Eye;
            return <div key={title as string} className="surface-panel rounded-2xl border border-slate-300/80 p-6"><IconComponent className="size-6 text-blue-600" /><h2 className="mt-6 text-lg font-semibold text-slate-950">{title as string}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description as string}</p></div>;
          })}
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}
