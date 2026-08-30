import type { Metadata } from "next";
import { Blocks, Database, Gauge, ShieldCheck } from "lucide-react";

import { CtaBand } from "@/components/cta-band";
import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { conceptProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work",
  description: "Explore the delivery framework and clearly labeled illustrative project concepts used by Driftline Tech.",
  alternates: { canonical: "/work" },
};

export default function WorkPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Work" title="Good work connects the visible experience to the system underneath." description="Driftline is building its public portfolio. Until verified case studies are ready, this page explains our delivery standards and uses clearly labeled illustrative concepts rather than invented customers or results." />
      <section className="bg-[#f6f9fd] py-20 sm:py-24">
        <div className="page-shell grid gap-5 md:grid-cols-2">
          {conceptProjects.map((project, index) => (
            <article key={project.title} className="relative min-h-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_55px_rgba(11,22,38,.07)]">
              <div className="absolute inset-x-0 top-0 h-40 bg-[#071522] [background-image:radial-gradient(circle_at_80%_30%,rgba(0,194,255,.28),transparent_35%),linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:auto,28px_28px,28px_28px]" aria-hidden="true" />
              <div className="relative flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-sky-300">{index % 2 === 0 ? <Blocks className="size-6" /> : <Database className="size-6" />}</div>
              <div className="relative mt-32">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-600">Illustrative concept · {project.type}</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">{project.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{project.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-white py-20">
        <div className="page-shell">
          <p className="section-kicker">Every delivery should include</p>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              [Gauge, "A measurable goal", "The work begins with an operating or customer outcome, not a list of fashionable features."],
              [ShieldCheck, "Security boundaries", "Identity, authorization, validation, data exposure, and recovery are designed deliberately."],
              [Blocks, "Maintainable structure", "Components, APIs, content, and environments are organized for the next change."],
              [Database, "An ownership path", "Documentation, observability, releases, and rollback make the result operable."],
            ].map(([Icon, title, description]) => {
              const IconComponent = Icon as typeof Gauge;
              return <div key={title as string} className="rounded-2xl border border-slate-200 p-6"><IconComponent className="size-6 text-blue-600" /><h2 className="mt-6 font-semibold text-slate-950">{title as string}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description as string}</p></div>;
            })}
          </div>
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}
