import type { Metadata } from "next";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = { title: "Software License Framework", description: "Provisional Driftline Tech software license terms framework.", alternates: { canonical: "/legal/software-license" } };

export default function SoftwareLicensePage() {
  return (
    <MarketingShell>
      <InnerHero eyebrow="Legal" title="Software license framework" description="A modular legal framework for future Driftline products. Each released product must publish final license terms, commercial rights, support scope, and applicable notices before sale." />
      <article className="page-shell legal-copy py-16 sm:py-20">
        <p className="legal-notice">Provisional framework · Not a product license · Legal and business decisions remain open</p>
        <h2>1. License grant</h2><p>Final terms should define whether a license is per-user, per-device, subscription, perpetual, trial, organization-wide, or another model, together with geographic and commercial-use limits.</p>
        <h2>2. Account and activation</h2><p>A license may require a Driftline account, online activation, periodic validation, device registration, and compliance with activation limits. Possession of a key alone does not establish entitlement.</p>
        <h2>3. Restrictions</h2><p>Final terms should address redistribution, resale, rental, circumvention, reverse engineering to the extent permitted by law, unauthorized automation, and misuse of hosted APIs.</p>
        <h2>4. Updates and support</h2><p>Each product should state included release channels, version entitlement, maintenance period, minimum supported versions, critical updates, and support lifecycle.</p>
        <h2>5. Term, expiration, and revocation</h2><p>Licenses may expire, be suspended, or be revoked according to the applicable purchase, subscription, refund, fraud, chargeback, or breach terms, subject to law.</p>
        <h2>6. Data and telemetry</h2><p>Any product telemetry must be documented by purpose, fields, retention, access, and user controls. Sensitive content should not be collected merely because it is technically available.</p>
        <h2>7. Open-source and third-party notices</h2><p>Released software should include applicable third-party licenses, notices, and attribution in the product or accompanying documentation.</p>
        <h2>8. Finalization checklist</h2><p>Before sale: approve price and refund policy, license scope, renewal behavior, tax handling, support terms, warranty and liability terms, privacy disclosures, export considerations, and governing law.</p>
      </article>
    </MarketingShell>
  );
}
