import Image from "next/image";
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
    href: "/services/web-design-development",
    icon: MonitorSmartphone,
    title: "Web design & development",
    description: "Fast, accessible websites shaped around your brand and business goals.",
  },
  {
    href: "/services/custom-software",
    icon: Code2,
    title: "Custom applications",
    description: "Secure, scalable tools built around the way your team actually works.",
  },
  {
    href: "/services/automation-integrations",
    icon: Workflow,
    title: "Automation & integrations",
    description: "Connected systems and thoughtful workflows that remove repetitive work.",
  },
  {
    href: "/services/ai-solutions",
    icon: Bot,
    title: "AI solutions",
    description: "Practical AI experiences designed for real operations and measurable value.",
  },
  {
    href: "/services/support-maintenance",
    icon: Headphones,
    title: "Support & maintenance",
    description: "Dependable improvement, monitoring, and care after launch.",
  },
  {
    href: "/services/technology-consulting",
    icon: Braces,
    title: "Technology consulting",
    description: "Clear technical direction for complex product and platform decisions.",
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#06111e] text-white">
      <SiteHeader />

      <section data-surface="dark" className="hero-grid relative border-b border-white/10">
        <div className="hero-glow" aria-hidden="true" />
        <div className="page-shell relative grid min-h-[650px] items-center gap-10 py-20 lg:grid-cols-[.98fr_1.02fr] lg:pb-8 lg:pt-20">
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

          <div className="hero-device-stage relative mx-auto flex min-w-0 w-full items-end justify-center lg:min-h-[500px] lg:self-end lg:justify-end">
            <Image
              src="/brand/Driftline-Tech-Hero-Devices-v2.png"
              alt="Laptop and smartphone displaying Driftline Tech digital solutions."
              width={1827}
              height={861}
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 1023px) calc(100vw - 2rem), (max-width: 1439px) 56vw, 940px"
              className="relative z-10 h-auto w-full shrink-0 max-w-[820px] object-contain lg:-translate-y-6 lg:w-[clamp(620px,58vw,720px)] lg:max-w-none xl:-translate-y-8 xl:w-[clamp(840px,55vw,1080px)]"
            />
          </div>
        </div>
      </section>

      <section data-surface="dark" className="relative bg-[#081827] py-20 sm:py-24">
        <div className="page-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-kicker">What we do</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Technology that moves your business forward</h2>
            <p className="mt-4 text-base leading-7 text-slate-400">Bring the website, workflow, data, and long-term support into one coordinated plan.</p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {services.map(({ href, icon: Icon, title, description }) => (
              <article key={title} className="group flex min-h-[270px] flex-col bg-[#081827] p-6 transition-colors hover:bg-[#0b2034]">
                <Icon className="size-7 text-blue-400 transition-transform group-hover:-translate-y-0.5" strokeWidth={1.8} aria-hidden="true" />
                <h3 className="mt-7 text-lg font-semibold leading-6">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
                <Link href={href} className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-medium text-sky-400 hover:text-sky-300">
                  Learn more <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-we-deliver" data-surface="dark" className="relative border-t border-white/10 bg-[#081827] py-20 sm:py-24">
        <div className="page-shell grid items-center gap-12 lg:grid-cols-[.72fr_1.28fr] xl:gap-16">
          <div className="max-w-xl">
            <p className="section-kicker">How we deliver</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Built around your business.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
              Every engagement is shaped around your goals, existing systems, and the way your team actually works. We combine strategy, design, engineering, automation, integration, and ongoing support into one practical delivery process.
            </p>
          </div>
          <DeliveryOverview />
        </div>
      </section>

      <section data-surface="light" className="bg-[#f6f9fd] py-20 text-slate-950 sm:py-24">
        <div className="page-shell">
          <div className="max-w-3xl">
            <p className="section-kicker">How we work</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">A clear path from business problem to dependable system.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Every engagement starts with the outcome, then connects the customer experience, data, workflows, security, and long-term ownership needed to support it.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["01", "Understand the work", "Clarify the people, process, constraints, and measurable outcome before choosing the technology."],
              ["02", "Design the system", "Shape the interface, architecture, integrations, and operating model as one coherent solution."],
              ["03", "Launch with ownership", "Deliver documentation, operational visibility, support, and a practical path for the next change."],
            ].map(([step, title, description]) => (
              <article key={step} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_16px_45px_rgba(11,22,38,.06)] sm:p-8">
                <span className="text-xs font-semibold uppercase tracking-[.16em] text-blue-600">Step {step}</span>
                <h3 className="mt-8 text-xl font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-surface="dark" className="bg-[#06111e] py-20 text-white sm:py-24">
        <div className="page-shell">
          <div className="max-w-3xl">
            <p className="section-kicker">Why businesses choose Driftline</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Technology decisions should make the business easier to run.</h2>
            <p className="mt-4 text-base leading-7 text-slate-400">The work is shaped to reduce uncertainty now and leave your team with a system it can understand, operate, and improve.</p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
            {[
              ["One accountable partner", "Customer experience, data, integrations, security, and launch planning stay connected from discovery through support."],
              ["Decisions tied to outcomes", "Every recommendation should answer a customer need, an operating constraint, or a measurable business goal."],
              ["Ready for real operations", "Testing, visibility, documentation, recovery paths, and access controls are considered before handoff."],
              ["Built for the next change", "Modular systems and clear ownership make the next improvement easier without starting over."],
            ].map(([title, description]) => (
              <article key={title} className="bg-[#0a1d30] p-7 sm:p-8">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-surface="light" className="bg-white py-20 text-slate-950 sm:py-24">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <p className="section-kicker">Start with the problem</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">You do not need a finished specification to begin.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Tell us what is not working, who it affects, and what a better outcome would change. We will help turn that context into a practical next step.</p>
          </div>
          <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-lg bg-blue-600 px-6 text-base text-white hover:bg-blue-500")}>
            Tell us what you need <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function DeliveryOverview() {
  const stages = ["Discover", "Build", "Launch", "Improve"];

  return (
    <div className="delivery-surface w-full max-w-[780px] justify-self-end" aria-label="Driftline Tech delivery model">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-rose-400/80" />
          <span className="size-2.5 rounded-full bg-amber-300/80" />
          <span className="size-2.5 rounded-full bg-emerald-300/80" />
        </div>
        <span className="text-xs font-medium tracking-wide text-slate-400">HOW WE DELIVER</span>
      </div>
      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[1.08fr_.92fr]">
        <div className="rounded-xl border border-white/10 bg-[#0a1d30] p-5">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">Capability overview</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">Built around your business</p>
            </div>
            <CloudCog className="size-6 shrink-0 text-sky-400" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            {["Web experiences", "Custom applications", "Automation & integrations"].map((capability, index) => (
              <div key={capability} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[.035] p-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", index === 0 ? "bg-emerald-400/15 text-emerald-300" : index === 1 ? "bg-violet-400/15 text-violet-300" : "bg-sky-400/15 text-sky-300")}>
                  {index === 0 ? <Workflow className="size-4" aria-hidden="true" /> : index === 1 ? <Braces className="size-4" aria-hidden="true" /> : <Layers3 className="size-4" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-100">{capability}</span>
                <span className="size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.65)]" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-xl border border-sky-400/20 bg-gradient-to-br from-blue-600/20 to-sky-400/5 p-5">
            <p className="text-xs text-slate-400">Delivery stages</p>
            <ol aria-label="Delivery stages" className="mt-4 grid grid-cols-2 gap-2">
              {stages.map((stage, index) => (
                <li key={stage} className="rounded-lg border border-white/10 bg-white/[.045] p-3">
                  <span className="text-[.65rem] font-semibold tracking-[.12em] text-sky-400">0{index + 1}</span>
                  <span className="mt-1 block text-sm font-medium text-slate-100">{stage}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a1d30] p-5">
            <p className="text-xs text-slate-400">Operating principle</p>
            <div className="mt-4 flex items-center gap-3"><span className="size-2.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" /><span className="text-sm font-medium">Designed to scale</span></div>
            <p className="mt-4 text-xs leading-5 text-slate-400">Clear decisions, a supported launch, and steady improvement after delivery.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
