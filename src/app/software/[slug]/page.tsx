import type { Metadata } from "next";
import { Check, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { CheckoutButton } from "@/components/checkout-button";
import { InnerHero } from "@/components/inner-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { getPublicProduct, getPublicProductEditions } from "@/lib/product-data";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) return {};
  return { title: product.name, description: product.shortDescription, alternates: { canonical: "/software/" + product.slug } };
}

function formatPrice(amountMinor: number, currency: string) {
  if (amountMinor === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [product, editions] = await Promise.all([getPublicProduct(slug), getPublicProductEditions(slug)]);
  if (!product || product.status !== "available") notFound();
  return (
    <MarketingShell>
      <InnerHero eyebrow={product.eyebrow} title={product.name} description={product.description} />
      <section className="surface-light py-20 sm:py-24">
        <div className="page-shell grid gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="section-kicker">Product capabilities</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">A focused toolkit, with clear edition boundaries.</h2>
            <ul className="mt-8 grid gap-3">
              {product.features.map((feature) => <li key={feature} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-700"><Check className="mt-0.5 size-5 shrink-0 text-blue-600" />{feature}</li>)}
            </ul>
            <div className="mt-8 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-950"><ShieldCheck className="size-6 shrink-0 text-blue-600" /><p>{product.licenseModel}. License and feature access are issued and validated by the shared Driftline platform.</p></div>
          </div>
          <div>
            <p className="section-kicker">Editions</p>
            {editions.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {editions.map((edition) => (
                  <article key={edition.id} className="flex flex-col rounded-2xl border border-slate-300 bg-white p-7 shadow-[0_16px_45px_rgba(11,22,38,.07)]">
                    <h2 className="text-2xl font-semibold text-slate-950">{edition.name}</h2>
                    <p className="mt-2 text-3xl font-semibold text-blue-600">{edition.price ? formatPrice(edition.price.amountMinor, edition.price.currency) : "Unavailable"}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{edition.price?.amountMinor ? "One-time purchase" : "No purchase required"}</p>
                    <p className="mt-5 text-sm leading-6 text-slate-600">{edition.description}</p>
                    <ul className="mt-6 space-y-2 text-sm text-slate-700">
                      {edition.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />{feature.replaceAll("_", " ")}</li>)}
                    </ul>
                    {edition.activationRequired ? <p className="mt-5 text-xs text-slate-500">Perpetual license · {edition.activationLimit} active installations</p> : <p className="mt-5 text-xs text-slate-500">No license key or activation required</p>}
                    <div className="mt-auto pt-7">
                      {edition.activationRequired ? <CheckoutButton productId={product.slug} editionId={edition.code} configured={Boolean(edition.price?.configured)} /> : <p className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">Included with the product download</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="mt-5 rounded-2xl border border-slate-300 bg-white p-7 text-sm leading-6 text-slate-600">Edition pricing will appear when the public platform database is connected.</div>}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
