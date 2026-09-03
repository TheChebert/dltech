import type { Metadata } from "next";
import { MapPin, Phone, ShieldCheck } from "lucide-react";

import { ContactForm } from "@/components/contact-form";
import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Contact Driftline Tech in La Crosse, WI",
  description: "Call 608-502-0949 or contact Driftline Tech for web design, custom software, automation, AI, consulting, or support in the La Crosse area.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const topicParam = (await searchParams).topic;
  const defaultTopic =
    topicParam === "support" || topicParam === "consulting" || topicParam === "other"
      ? topicParam
      : "project";
  return (
    <MarketingShell>
      <InnerHero eyebrow="Contact" title="Tell us what needs to work better." description="Share the problem, the business context, and the outcome you are aiming for. If it is a fit for Driftline, we will continue the conversation with a practical next step." />
      <section className="surface-light py-20 sm:py-24">
        <div className="page-shell grid gap-10 lg:grid-cols-[.78fr_1.22fr]">
          <div>
            <p className="section-kicker">Start here</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950">A useful first message does not need to be a full specification.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">A short description of the current situation, who is affected, and what success looks like is enough to begin.</p>
            <div className="mt-8 space-y-4">
              <a href="tel:+16085020949" className="flex items-center gap-4 surface-panel rounded-xl border border-slate-300/80 p-4 text-sm font-medium text-slate-800 hover:border-blue-300"><Phone className="size-5 text-blue-600" />608-502-0949</a>
              <div className="flex items-center gap-4 surface-panel rounded-xl border border-slate-300/80 p-4 text-sm font-medium text-slate-800"><MapPin className="size-5 text-blue-600" />La Crosse, WI area · Remote-first</div>
              <div className="flex items-center gap-4 surface-panel rounded-xl border border-slate-300/80 p-4 text-sm font-medium text-slate-800"><ShieldCheck className="size-5 text-blue-600" />Please do not send passwords, keys, or sensitive customer data</div>
            </div>
          </div>
          <ContactForm defaultTopic={defaultTopic} />
        </div>
      </section>
    </MarketingShell>
  );
}
