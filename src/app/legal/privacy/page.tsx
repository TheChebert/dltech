import type { Metadata } from "next";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Driftline Tech collects, uses, protects, and shares information.", alternates: { canonical: "/legal/privacy" } };

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Legal" title="Privacy policy" description="How Driftline Tech handles information from website visitors, customer contacts, and invited account users." />
      <LegalContent>
        <h2>1. Scope</h2><p>This policy applies to Driftline Tech websites, contact and support channels, invited customer accounts, and services that link to this page.</p>
        <h2>2. Information you provide</h2><p>When you contact us, we receive the details you submit, such as your name, work email, company, inquiry topic, and message. Invited account users may also provide an email address, profile information, support details, and information needed to deliver an agreed service.</p>
        <h2>3. Technical and security information</h2><p>We may process an IP address, browser or device information, authentication records, request timestamps, and security events to operate the site, prevent abuse, troubleshoot problems, and protect customer access.</p>
        <h2>4. How information is used</h2><p>We use information to respond to inquiries, provide and support services, manage authorized access, maintain security and reliability, improve customer workflows, and meet contractual or legal obligations.</p>
        <h2>5. Cookies and analytics</h2><p>Essential cookies are used when an invited customer signs in and to maintain secure account sessions. Driftline Tech does not currently use advertising cookies or third-party behavioral advertising on this site.</p>
        <h2>6. Service providers and sharing</h2><p>Hosting, database, authentication, security, and communications providers may process information only as needed to operate Driftline Tech services. We may also disclose information when required by law, to protect rights or safety, or as part of a business transaction with appropriate safeguards. Driftline Tech does not sell personal information.</p>
        <h2>7. Retention and security</h2><p>We retain information only as long as reasonably needed for the purpose it was collected, including service delivery, security, recordkeeping, and legal obligations. We use administrative and technical safeguards appropriate to the information and service, but no system can guarantee absolute security.</p>
        <h2>8. Your choices</h2><p>You may ask to access, correct, or delete information associated with you. Some records may need to be retained for security, contractual, or legal reasons. Additional rights may apply depending on where you live.</p>
        <h2>9. Changes to this policy</h2><p>We may update this policy as the site, services, or legal requirements change. The date at the top identifies the current version.</p>
        <h2>10. Contact</h2><p>Privacy questions or requests can be sent to <a href="mailto:hello@driftlinetech.com">hello@driftlinetech.com</a>.</p>
      </LegalContent>
    </MarketingShell>
  );
}

function LegalContent({ children }: { children: React.ReactNode }) {
  return <article className="page-shell legal-copy py-16 sm:py-20"><p className="legal-notice">Last updated August 30, 2026</p>{children}</article>;
}
