import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Braces,
  Check,
  Code2,
  Headphones,
  MapPin,
  MonitorSmartphone,
  Phone,
  Workflow,
} from "lucide-react";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { buttonVariants } from "@/components/ui/button";
import { absoluteUrl, serializeJsonLd, serviceAreas, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Web Design & Custom Software in La Crosse, WI",
  description:
    "La Crosse, Wisconsin web design, custom software, automation, AI, integrations, technology consulting, and ongoing support from Driftline Tech.",
  alternates: { canonical: "/la-crosse-wi" },
  openGraph: {
    title: "Web Design & Custom Software in La Crosse, WI | Driftline Tech",
    description:
      "A La Crosse-area technology partner for websites, custom software, automation, AI solutions, integrations, consulting, and support.",
    url: "/la-crosse-wi",
  },
};

const localServices = [
  {
    href: "/services/web-design-development",
    icon: MonitorSmartphone,
    title: "Web design & development",
    description: "Fast, accessible business websites designed to build trust and turn local search traffic into useful inquiries.",
  },
  {
    href: "/services/custom-software",
    icon: Code2,
    title: "Custom software",
    description: "Customer portals, internal tools, and focused applications shaped around the way your organization works.",
  },
  {
    href: "/services/automation-integrations",
    icon: Workflow,
    title: "Automation & integrations",
    description: "Reliable connections between the platforms, data, and repeatable processes your team depends on.",
  },
  {
    href: "/services/ai-solutions",
    icon: Bot,
    title: "Practical AI solutions",
    description: "Measured AI features and workflows with clear human review, privacy, quality, and cost controls.",
  },
  {
    href: "/services/support-maintenance",
    icon: Headphones,
    title: "Support & maintenance",
    description: "Ongoing monitoring, updates, improvements, and dependable care for business-critical digital systems.",
  },
  {
    href: "/services/technology-consulting",
    icon: Braces,
    title: "Technology consulting",
    description: "Clear planning for architecture, vendors, modernization, security, delivery, and build-versus-buy decisions.",
  },
];

const faqs = [
  {
    question: "What technology services does Driftline Tech provide in La Crosse?",
    answer:
      "Driftline Tech provides web design and development, custom software, automation and integrations, practical AI solutions, support and maintenance, and technology consulting.",
  },
  {
    question: "Do you only work with businesses in La Crosse?",
    answer:
      "No. Driftline Tech is based in the La Crosse area and works with organizations across the Coulee Region as well as teams that prefer remote collaboration.",
  },
  {
    question: "Can you improve an existing website or software system?",
    answer:
      "Yes. An engagement can begin with an existing website, application, integration, or workflow. We first inspect the current system, the business goal, and the risks before recommending a practical next step.",
  },
  {
    question: "How do I start a project?",
    answer:
      `Call ${siteConfig.phoneDisplay} or send a short message describing what is not working, who it affects, and what a better outcome would change. A finished specification is not required.`,
  },
];

const localPageGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": absoluteUrl("/la-crosse-wi#webpage"),
      url: absoluteUrl("/la-crosse-wi"),
      name: "Web Design & Custom Software in La Crosse, WI",
      description: metadata.description,
      inLanguage: "en-US",
      about: { "@id": absoluteUrl("/#organization") },
      breadcrumb: { "@id": absoluteUrl("/la-crosse-wi#breadcrumb") },
    },
    {
      "@type": "Service",
      "@id": absoluteUrl("/la-crosse-wi#services"),
      name: "Technology services in the La Crosse, Wisconsin area",
      serviceType: "Web design, custom software, automation, AI solutions, integrations, support, and technology consulting",
      provider: { "@id": absoluteUrl("/#organization") },
      areaServed: serviceAreas,
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Driftline Tech services",
        itemListElement: localServices.map((service) => ({
          "@type": "Offer",
          url: absoluteUrl(service.href),
          itemOffered: { "@type": "Service", name: service.title, description: service.description },
        })),
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": absoluteUrl("/la-crosse-wi#breadcrumb"),
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "La Crosse, WI technology services", item: absoluteUrl("/la-crosse-wi") },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

export default function LaCrosseTechnologyServicesPage() {
  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(localPageGraph) }} />
      <InnerHero
        eyebrow="La Crosse, Wisconsin technology partner"
        title="Web design, custom software, and automation built around your business."
        description="Driftline Tech is based in the La Crosse area and helps organizations turn website, software, workflow, and technology problems into clear, dependable systems."
        actions={
          <>
            <Link href="/contact?topic=project" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-lg bg-blue-600 px-6 text-base text-white hover:bg-blue-500")}>
              Discuss a project <ArrowRight aria-hidden="true" />
            </Link>
            <a href={`tel:${siteConfig.phoneE164}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-lg border-white/20 bg-white/5 px-6 text-base text-white hover:bg-white/10 hover:text-white")}>
              <Phone aria-hidden="true" /> Call {siteConfig.phoneDisplay}
            </a>
          </>
        }
      />

      <section className="surface-light py-20 text-slate-950 sm:py-24">
        <div className="page-shell grid items-start gap-12 lg:grid-cols-[.78fr_1.22fr]">
          <div>
            <p className="section-kicker">Local context, practical delivery</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">A technology partner close to the work.</h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-slate-600">
            <p>
              A local project still has to meet the same standards as any serious digital product: clear customer journeys, accessible interfaces, secure data, reliable releases, and ownership after launch.
            </p>
            <p>
              Driftline brings those pieces into one plan. We can work closely with teams in La Crosse and the surrounding Coulee Region while using a remote-friendly process that keeps decisions, progress, and next steps visible.
            </p>
            <Link href="/about" className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-500">
              Learn how Driftline works <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="surface-light-alt py-20 sm:py-24">
        <div className="page-shell">
          <div className="max-w-3xl">
            <p className="section-kicker">Technology services</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">One connected plan for the experience and the system behind it.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Start with one focused need or bring the connected work required to move a larger business system forward.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {localServices.map(({ href, icon: Icon, title, description }) => (
              <article key={href} className="surface-panel flex min-h-[300px] flex-col rounded-2xl border border-slate-300/80 p-7 shadow-[0_16px_45px_rgba(11,22,38,.06)]">
                <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="size-6" aria-hidden="true" /></span>
                <h3 className="mt-7 text-xl font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
                <Link href={href} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-blue-600 hover:text-blue-500">
                  Explore this service <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-dark py-20 text-white sm:py-24">
        <div className="page-shell grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <MapPin className="size-7 text-sky-400" aria-hidden="true" />
            <p className="section-kicker mt-7">Service area</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Based in the La Crosse area. Built to collaborate anywhere.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">Local service includes La Crosse and nearby Coulee Region communities, with remote collaboration available for organizations beyond the area.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["La Crosse", "Onalaska", "Holmen", "West Salem", "The surrounding Coulee Region", "Remote collaboration"].map((area) => (
              <div key={area} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-5 text-sm font-medium text-slate-200">
                <Check className="size-4 shrink-0 text-sky-400" aria-hidden="true" /> {area}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-light py-20 text-slate-950 sm:py-24">
        <div className="page-shell grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="section-kicker">Frequently asked questions</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Before we start.</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="surface-panel group rounded-2xl border border-slate-300/80 p-6 open:border-blue-300">
                <summary className="cursor-pointer list-none pr-8 text-lg font-semibold text-slate-950 marker:hidden">{faq.question}</summary>
                <p className="mt-4 text-sm leading-7 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-dark-alt py-20 text-white">
        <div className="page-shell grid items-center gap-8 rounded-2xl border border-sky-400/20 bg-gradient-to-br from-blue-600/15 via-[#0a1d30] to-cyan-400/5 p-8 sm:p-12 lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <p className="section-kicker">Start in La Crosse</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Tell us what needs to work better.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">A short description of the problem and the outcome you want is enough to begin.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a href={`tel:${siteConfig.phoneE164}`} className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-lg bg-blue-600 px-6 text-base text-white hover:bg-blue-500")}>
              <Phone aria-hidden="true" /> {siteConfig.phoneDisplay}
            </a>
            <Link href="/contact?topic=project" className="text-center text-sm font-semibold text-sky-300 hover:text-sky-200">Send a project message</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
