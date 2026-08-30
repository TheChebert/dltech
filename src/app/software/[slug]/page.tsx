import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleDot, Cpu, KeyRound, Laptop, RefreshCw } from "lucide-react";
import { notFound } from "next/navigation";

import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { buttonVariants } from "@/components/ui/button";
import { products } from "@/lib/content";
import { getPublicProduct } from "@/lib/product-data";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps<"/software/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: "/software/" + product.slug },
    openGraph: {
      title: product.name + " | Driftline Tech",
      description: product.shortDescription,
      url: "/software/" + product.slug,
      images: [],
    },
    twitter: { card: "summary", title: product.name + " | Driftline Tech", description: product.shortDescription, images: [] },
  };
}

export default async function ProductDetailPage({ params }: PageProps<"/software/[slug]">) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();

  return (
    <MarketingShell>
      <InnerHero
        eyebrow={product.eyebrow}
        title={product.name}
        description={product.description}
        actions={
          <>
            <Link href="/contact?topic=product" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-lg bg-blue-600 px-6 text-base text-white hover:bg-blue-500")}>Ask about availability <ArrowRight aria-hidden="true" /></Link>
            <Link href="/software" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-lg border-white/20 bg-white/5 px-6 text-base text-white hover:bg-white/10 hover:text-white")}><ArrowLeft aria-hidden="true" /> All software</Link>
          </>
        }
      />
      <section className="bg-[#f6f9fd] py-20 sm:py-24">
        <div className="page-shell grid gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="section-kicker">Product direction</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950">A focused feature set with a durable platform underneath.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {product.features.map((feature) => (
                <div key={feature} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <Check className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden="true" />
                  <span className="text-sm font-medium leading-6 text-slate-800">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_18px_55px_rgba(11,22,38,.08)]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Availability</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{product.statusLabel}</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CircleDot className="size-5" /></span>
            </div>
            <dl className="mt-6 space-y-5">
              <div><dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Pricing</dt><dd className="mt-1 text-sm font-medium text-slate-900">{product.pricingLabel}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Version</dt><dd className="mt-1 text-sm font-medium text-slate-900">{product.version ?? "No public release yet"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Platforms</dt><dd className="mt-1 text-sm font-medium text-slate-900">{product.platforms.join(", ")}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">License</dt><dd className="mt-1 text-sm font-medium text-slate-900">{product.licenseModel}</dd></div>
            </dl>
          </aside>
        </div>
      </section>
      <section className="bg-white py-20">
        <div className="page-shell grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="section-kicker">System requirements</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950">Clear before download.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Requirements, release notes, support lifecycle, and download integrity will be published before general availability.</p>
          </div>
          <div className="space-y-3">
            {product.requirements.map((requirement) => (
              <div key={requirement} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5"><Laptop className="size-5 text-blue-600" /><span className="text-sm font-medium text-slate-800">{requirement}</span></div>
            ))}
            <div className="grid gap-3 sm:grid-cols-3">
              {[[KeyRound, "Account-backed licensing"], [RefreshCw, "Versioned updates"], [Cpu, "Verified release assets"]].map(([Icon, label]) => {
                const IconComponent = Icon as typeof KeyRound;
                return <div key={label as string} className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700"><IconComponent className="mb-3 size-5 text-blue-600" />{label as string}</div>;
              })}
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
