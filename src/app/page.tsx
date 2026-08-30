import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Braces,
  CloudCog,
  Code2,
  Headphones,
  Layers3,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const services = [
  {
    icon: MonitorSmartphone,
    title: "Web design & development",
    description: "Fast, accessible websites shaped around your brand and business goals.",
  },
  {
    icon: Code2,
    title: "Custom applications",
    description: "Secure, scalable tools built around the way your team actually works.",
  },
  {
    icon: Workflow,
    title: "Automation & integrations",
    description: "Connected systems and thoughtful workflows that remove repetitive work.",
  },
  {
    icon: Bot,
    title: "AI solutions",
    description: "Practical AI experiences designed for real operations and measurable value.",
  },
  {
    icon: Headphones,
    title: "Support & maintenance",
    description: "Dependable improvement, monitoring, and care after launch.",
  },
  {
    icon: Braces,
    title: "Technology consulting",
    description: "Clear technical direction for complex product and platform decisions.",
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#06111e] text-white">
      <SiteHeader />

      <section className="hero-grid relative border-b border-white/10">
        <div className="hero-glow" aria-hidden="true" />
        <div className="page-shell relative grid min-h-[690px] items-center gap-14 py-20 lg:grid-cols-[1.02fr_.98fr] lg:py-24">
          <div className="max-w-3xl">
            <div className="eyebrow mb-7"><Sparkles className="size-4" aria-hidden="true" /> Websites, applications, and connected systems</div>
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl xl:text-[4.75rem]">
              Custom solutions.
              <span className="mt-1 block text-gradient">Connected technology.</span>
              <span className="mt-1 block">Real results.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Driftline Tech designs and builds modern websites, custom applications, automation, and connected digital systems around real-world business needs.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/services" className={cn(buttonVariants({ size: "lg" }), "h-13 rounded-lg bg-blue-600 px-6 text-base text-white shadow-xl shadow-blue-950/40 hover:bg-blue-500")}>
                Explore services <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/contact" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-13 rounded-lg border-white/20 bg-white/5 px-6 text-base text-white hover:bg-white/10 hover:text-white")}>
                Discuss a project
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-sky-400" /> Built with security in mind</span>
              <span className="inline-flex items-center gap-2"><Layers3 className="size-4 text-sky-400" /> Designed to grow with you</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[650px] lg:mx-0">
            <div className="product-surface">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-rose-400/80" />
                  <span className="size-2.5 rounded-full bg-amber-300/80" />
                  <span className="size-2.5 rounded-full bg-emerald-300/80" />
                </div>
                <span className="text-xs font-medium tracking-wide text-slate-400">DELIVERY OVERVIEW</span>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-xl border border-white/10 bg-[#0a1d30] p-5">
                  <div className="mb-8 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">Capability overview</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Built around your business</h2>
                    </div>
                    <CloudCog className="size-6 text-sky-400" aria-hidden="true" />
                  </div>
                  <div className="space-y-3">
                    {["Web experiences", "Custom applications", "Automation & integrations"].map((capability, index) => (
                      <div key={capability} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[.035] p-3">
                        <span className={cn("flex size-9 items-center justify-center rounded-lg", index === 0 ? "bg-emerald-400/15 text-emerald-300" : index === 1 ? "bg-violet-400/15 text-violet-300" : "bg-sky-400/15 text-sky-300")}>
                          {index === 0 ? <Workflow className="size-4" /> : index === 1 ? <Braces className="size-4" /> : <Layers3 className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-100">{capability}</span>
                        <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.65)]" aria-label="Available" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-xl border border-sky-400/20 bg-gradient-to-br from-blue-600/20 to-sky-400/5 p-5">
                    <p className="text-xs text-slate-400">Core capabilities</p>
                    <p className="mt-3 text-3xl font-semibold">06</p>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-4/5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300" /></div>
                    <p className="mt-3 text-xs text-slate-400">Web, apps, automation, AI, support, consulting</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0a1d30] p-5">
                    <p className="text-xs text-slate-400">Delivery approach</p>
                    <div className="mt-4 flex items-center gap-3"><span className="size-2.5 rounded-full bg-emerald-400" /><span className="text-sm font-medium">Designed to scale</span></div>
                    <div className="mt-6 flex h-16 items-end gap-1.5" aria-hidden="true">
                      {[36, 52, 44, 68, 58, 82, 72, 94, 84, 100].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-600/60 to-cyan-300/90" style={{ height: height + "%" }} />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#081827] py-20 sm:py-24">
        <div className="page-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-kicker">What we do</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Technology that moves your business forward</h2>
            <p className="mt-4 text-base leading-7 text-slate-400">One partner for thoughtful strategy, polished experiences, and dependable software.</p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {services.map(({ icon: Icon, title, description }) => (
              <article key={title} className="group flex min-h-[270px] flex-col bg-[#081827] p-6 transition-colors hover:bg-[#0b2034]">
                <Icon className="size-7 text-blue-400 transition-transform group-hover:-translate-y-0.5" strokeWidth={1.8} aria-hidden="true" />
                <h3 className="mt-7 text-lg font-semibold leading-6">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
                <Link href="/services" className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-medium text-sky-400 hover:text-sky-300">
                  Learn more <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#06111e] py-20 sm:py-24">
        <div className="page-shell">
          <div className="max-w-3xl">
            <p className="section-kicker">How we work</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Designed as a connected system, not a stack of isolated deliverables.</h2>
            <p className="mt-4 text-base leading-7 text-slate-400">Every engagement starts with the business outcome, then connects the experience, data, workflows, security, and long-term ownership needed to support it.</p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {[
              ["01", "Understand the work", "Clarify the people, process, constraints, and measurable outcome before choosing the technology."],
              ["02", "Design the system", "Shape the interface, architecture, integrations, and operating model as one coherent solution."],
              ["03", "Launch with ownership", "Deliver documentation, observability, support, and a practical path for the next change."],
            ].map(([step, title, description]) => (
              <article key={step} className="bg-[#0a1d30] p-7 sm:p-8">
                <span className="text-xs font-semibold uppercase tracking-[.16em] text-sky-400">Step {step}</span>
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 text-slate-950">
        <div className="page-shell grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Secure by design", "Authorization, validation, and least privilege are part of the architecture."],
            ["Built for change", "Systems and content can evolve without rebuilding the whole platform."],
            ["Clear ownership", "Documentation and observable systems make future work easier to operate."],
            ["Measured complexity", "Use proven services where they help, and custom code where it matters."],
          ].map(([title, description]) => (
            <div key={title} className="bg-white p-7">
              <h2 className="font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}