import type { Metadata } from "next";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = { title: "Terms of Service", description: "Driftline Tech website and platform terms framework.", alternates: { canonical: "/legal/terms" } };

export default function TermsPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Legal" title="Terms of service" description="These provisional terms provide a framework for the public site and online platform. Product purchases, subscriptions, and professional services require final commercial terms and legal review." />
      <article className="page-shell legal-copy py-16 sm:py-20">
        <p className="legal-notice">Provisional framework · Last updated August 30, 2026 · Legal review required before commercial launch</p>
        <h2>1. Acceptance and eligibility</h2><p>Use of Driftline services is subject to the terms presented for the applicable website, account, product, order, or professional engagement.</p>
        <h2>2. Accounts</h2><p>Users are responsible for maintaining access to their email and devices, providing accurate information, and promptly reporting suspected unauthorized access.</p>
        <h2>3. Acceptable use</h2><p>Users may not interfere with services, bypass access or license controls, probe systems without written authorization, distribute malware, misuse APIs, or use services unlawfully.</p>
        <h2>4. Products and services</h2><p>Product availability, features, pricing, support, and system requirements are those stated at the time of an order. Professional services are governed by a separate written agreement or statement of work.</p>
        <h2>5. Intellectual property</h2><p>Driftline and its licensors retain rights in software, documentation, branding, APIs, and platform materials. No rights are granted except those expressly stated.</p>
        <h2>6. Availability and changes</h2><p>Services may change to improve security, reliability, legal compliance, or product functionality. Maintenance, incidents, and external service failures may affect availability.</p>
        <h2>7. Disclaimers and liability</h2><p>Warranty, liability, indemnity, governing-law, and dispute terms must be finalized by qualified counsel and coordinated with the company’s commercial and insurance decisions.</p>
        <h2>8. Contact</h2><p>Questions can be sent to <a href="mailto:hello@driftlinetech.com">hello@driftlinetech.com</a>.</p>
      </article>
    </MarketingShell>
  );
}
