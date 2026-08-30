import type { Metadata } from "next";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = { title: "Privacy Policy", description: "Driftline Tech privacy policy framework.", alternates: { canonical: "/legal/privacy" } };

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Legal" title="Privacy policy" description="This production-ready privacy framework describes the data the current platform is designed to collect. It should be reviewed by qualified counsel before broad commercial launch." />
      <LegalContent>
        <h2>1. Scope</h2><p>This policy applies to Driftline Tech websites, customer accounts, product support, and application services that link to it.</p>
        <h2>2. Information we collect</h2><p>The platform may collect account information, contact submissions, product entitlements, license and activation records, support information, security events, and limited technical data needed to operate services.</p>
        <h2>3. How information is used</h2><p>Information is used to provide and secure services, respond to requests, manage products and licenses, deliver updates and downloads, investigate abuse, and meet legal obligations.</p>
        <h2>4. Cookies and local storage</h2><p>The current platform uses essential authentication storage when a customer signs in. Nonessential analytics or advertising cookies should not be enabled without an appropriate consent and disclosure review.</p>
        <h2>5. Sharing and service providers</h2><p>Information may be processed by infrastructure and service providers needed to host, secure, communicate, and operate Driftline services. Driftline does not design this platform to sell personal information.</p>
        <h2>6. Retention and security</h2><p>Records should be retained only for defined operational, security, contractual, and legal purposes. Technical and organizational safeguards are used, but no system can guarantee absolute security.</p>
        <h2>7. Your choices</h2><p>Depending on applicable law, individuals may have rights to access, correct, delete, or restrict certain information. Requests can be sent to hello@driftlinetech.com.</p>
        <h2>8. Contact</h2><p>Questions about this framework can be sent to <a href="mailto:hello@driftlinetech.com">hello@driftlinetech.com</a>.</p>
      </LegalContent>
    </MarketingShell>
  );
}

function LegalContent({ children }: { children: React.ReactNode }) {
  return <article className="page-shell legal-copy py-16 sm:py-20"><p className="legal-notice">Provisional framework · Last updated August 30, 2026 · Legal review required before commercial launch</p>{children}</article>;
}
