import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Compass, Layers3, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { CtaBand } from "@/components/cta-band";
import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { buttonVariants } from "@/components/ui/button";
import { getService, services } from "@/lib/content";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: service.name,
    description: service.shortDescription,
    alternates: { canonical: "/services/" + service.slug },
    openGraph: { title: service.name + " | Driftline Tech", description: service.shortDescription, url: "/services/" + service.slug },
  };
}

export default async function ServiceDetailPage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  return (
    <MarketingShell>
      <InnerHero
        eyebrow={service.name}
        title={service.headline}
        description={service.description}
        actions={
          <>
            <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-lg bg-blue-600 px-6 text-base text-white hover:bg-blue-500")}>Discuss your project <ArrowRight aria-hidden="true" /></Link>
            <Link href="/services" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-lg border-white/20 bg-white/5 px-6 text-base text-white hover:bg-white/10 hover:text-white")}><ArrowLeft aria-hidden="true" /> All services</Link>
          </>
        }
      />
      <section className="bg-white py-20 sm:py-24">
        <div className="page-shell grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="section-kicker">What this should change</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950">Outcomes before output.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">The exact deliverables depend on the problem. These are the operating improvements the work is designed to create.</p>
          </div>
          <div className="grid gap-4">
            {service.outcomes.map((outcome) => (
              <div key={outcome} className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Check className="size-4" aria-hidden="true" /></span>
                <p className="pt-1 font-medium leading-7 text-slate-800">{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-[#f6f9fd] py-20 sm:py-24">
        <div className="page-shell">
          <p className="section-kicker">Capabilities</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-.035em] text-slate-950">The pieces required to make the whole system work.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {service.capabilities.map((capability, index) => {
              const Icon = index % 3 === 0 ? Compass : index % 3 === 1 ? Layers3 : ShieldCheck;
              return (
                <div key={capability} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <Icon className="size-5 text-blue-600" aria-hidden="true" />
                  <h3 className="mt-6 font-semibold text-slate-950">{capability}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="bg-[#071522] py-20 text-white">
        <div className="page-shell">
          <p className="section-kicker">A measured process</p>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {service.process.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
                <span className="text-sm font-semibold text-sky-400">0{index + 1}</span>
                <p className="mt-12 text-base font-medium leading-7 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand title={"Ready to make " + service.name.toLowerCase() + " a practical next step?"} />
    </MarketingShell>
  );
}
