import type { Metadata } from "next";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { ProductCard } from "@/components/product-card";
import { getPublicProducts } from "@/lib/product-data";

export const metadata: Metadata = {
  title: "Software Products",
  description: "Explore software products built and licensed by Driftline Tech.",
  alternates: { canonical: "/software" },
};

export default async function SoftwarePage() {
  const products = (await getPublicProducts()).filter((product) => product.status === "available");
  return (
    <MarketingShell>
      <InnerHero eyebrow="Driftline software" title="Focused software for real work." description="Products are built on the same shared Driftline commerce, licensing, release, and support platform." />
      <section className="surface-light py-20 sm:py-24">
        <div className="page-shell grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      </section>
    </MarketingShell>
  );
}
