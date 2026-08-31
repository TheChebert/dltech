import type { Metadata } from "next";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = { title: "Terms of Service", description: "Terms governing use of the Driftline Tech website and customer account services.", alternates: { canonical: "/legal/terms" } };

export default function TermsPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Legal" title="Terms of service" description="The terms that apply when you use the Driftline Tech website, contact channels, and invited customer account services." />
      <article className="page-shell legal-copy py-16 sm:py-20">
        <p className="legal-notice">Last updated August 30, 2026</p>
        <h2>1. Scope and acceptance</h2><p>These terms apply to the Driftline Tech website, contact channels, and invited customer account services. By using them, you agree to these terms. A signed proposal, statement of work, service agreement, or other written agreement controls if it conflicts with these website terms.</p>
        <h2>2. Accounts and access</h2><p>Customer accounts are available by invitation. You are responsible for keeping access to your email and devices secure, providing accurate information, and promptly reporting suspected unauthorized use. Access may be limited or suspended to protect customers, systems, or legal obligations.</p>
        <h2>3. Acceptable use</h2><p>You may not disrupt the site or services, bypass access controls, probe systems without written authorization, distribute malicious code, misuse an API, impersonate another person, or use Driftline Tech systems unlawfully.</p>
        <h2>4. Inquiries and professional services</h2><p>Submitting an inquiry does not create a client relationship or guarantee that Driftline Tech will accept a project. Scope, pricing, schedule, ownership, support, and other commercial terms are established in the written agreement for each engagement.</p>
        <h2>5. Intellectual property</h2><p>Driftline Tech and its licensors retain rights in the site, branding, software, documentation, and other materials they provide, except where a written agreement states otherwise. You may not copy, modify, distribute, or commercially exploit those materials without permission.</p>
        <h2>6. Third-party services and links</h2><p>The site and customer work may rely on third-party platforms or link to external websites. Those services operate under their own terms and privacy practices, and Driftline Tech is not responsible for content or changes outside its control.</p>
        <h2>7. Availability and informational content</h2><p>We work to keep the site accurate and available, but content may change and uninterrupted operation is not guaranteed. Public site content is general information and is not a substitute for a project-specific written commitment.</p>
        <h2>8. Changes to these terms</h2><p>We may update these terms as the site, services, or legal requirements change. The date above identifies the current version. Continued use after an update means the revised terms apply from that point forward.</p>
        <h2>9. Contact</h2><p>Questions about these terms can be sent to <a href="mailto:hello@driftlinetech.com">hello@driftlinetech.com</a>.</p>
      </article>
    </MarketingShell>
  );
}
