import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CloudDownload, KeyRound, RefreshCw } from "lucide-react";

import { CtaBand } from "@/components/cta-band";
import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { getPublicProducts } from "@/lib/product-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Software",
  description: "Explore Driftline Tech software products and the platform being built to support accounts, licensing, releases, and downloads.",
  alternates: { canonical: "/software" },
};

export const revalidate = 300;

export default async function SoftwarePage() {
  const products = await getPublicProducts();
  return (
    <MarketingShell>
      <InnerHero
        eyebrow="Driftline software"
        title="Focused products, supported like products."
        description="Driftline software is being built on a shared platform for secure customer accounts, entitlements, licensing, releases, downloads, updates, and support. Availability is shown honestly while products are in development."
        actions={<Link href="#products" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-lg bg-blue-600 px-6 text-base text-white hover:bg-blue-500")}>Explore products <ArrowRight aria-hidden="true" /></Link>}
      />
      <section id="products" className="scroll-mt-20 bg-[#f6f9fd] py-20 sm:py-24">
        <div className="page-shell grid gap-5 md:grid-cols-3">
          {products.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      </section>
      <section className="bg-white py-20 sm:py-24">
        <div className="page-shell">
          <div className="max-w-3xl">
            <p className="section-kicker">The product platform</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-4xl">The infrastructure behind a trustworthy download.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">A software business needs more than a payment button and a file link. The Driftline platform is structured to connect the entire product lifecycle.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              [BadgeCheck, "Entitlements", "A verified record of which customer can use which product and version."],
              [KeyRound, "Licensing", "Server-validated activation, device limits, expiration, revocation, and audit history."],
              [CloudDownload, "Secure downloads", "Release assets tied to product access rather than exposed arbitrary files."],
              [RefreshCw, "Updates", "Versioned release channels, minimum supported versions, notes, and critical-update status."],
            ].map(([Icon, title, description]) => {
              const IconComponent = Icon as typeof BadgeCheck;
              return (
                <div key={title as string} className="rounded-2xl border border-slate-200 p-6">
                  <IconComponent className="size-6 text-blue-600" aria-hidden="true" />
                  <h3 className="mt-6 text-lg font-semibold text-slate-950">{title as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <CtaBand eyebrow="Product updates" title="Interested in a Driftline product that is still in development?" description="Tell us what you are trying to accomplish. We can share relevant availability information when product scope and release plans are ready." />
    </MarketingShell>
  );
}
