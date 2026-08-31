import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Braces, Code2, Headphones, MonitorSmartphone, Workflow } from "lucide-react";

import { CtaBand } from "@/components/cta-band";
import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { services } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services",
  description: "Web design, custom software, automation, AI solutions, support, and technology consulting from Driftline Tech.",
  alternates: { canonical: "/services" },
};

const icons = [MonitorSmartphone, Code2, Workflow, Bot, Headphones, Braces];

export default function ServicesPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Services" title="From first idea to dependable digital system." description="Driftline Tech combines product thinking, design, engineering, integration, and long-term care. Engage us for a focused project or for the connected work required to move a larger system forward." />
      <section className="surface-light py-20 sm:py-24">
        <div className="page-shell grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => {
            const Icon = icons[index];
            return (
              <article key={service.slug} className="group flex min-h-[350px] flex-col surface-panel rounded-2xl border border-slate-300/80 p-7 shadow-[0_16px_45px_rgba(11,22,38,.06)] transition hover:-translate-y-1 hover:shadow-[0_22px_65px_rgba(11,22,38,.11)]">
                <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="size-6" aria-hidden="true" /></span>
                <h2 className="mt-7 text-2xl font-semibold tracking-tight text-slate-950">{service.name}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{service.shortDescription}</p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  {service.outcomes.slice(0, 2).map((outcome) => <li key={outcome} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-400" />{outcome}</li>)}
                </ul>
                <Link href={"/services/" + service.slug} className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-semibold text-blue-600 hover:text-blue-500">
                  Explore this service <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>
      <section className="surface-light-alt py-20">
        <div className="page-shell grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="section-kicker">How engagements work</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950">A practical path with clear decisions.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["01", "Understand", "Clarify the audience, operating reality, risks, and desired outcome."],
              ["02", "Shape", "Define the smallest coherent solution and how success will be measured."],
              ["03", "Build", "Deliver secure, testable increments with visible progress and tradeoffs."],
              ["04", "Operate", "Launch with documentation, monitoring, support, and a next-step roadmap."],
            ].map(([step, title, description]) => (
              <div key={step} className="surface-panel rounded-2xl border border-slate-300/80 p-6">
                <span className="text-sm font-semibold text-blue-600">{step}</span>
                <h3 className="mt-5 text-xl font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}
