import Link from "next/link";
import { ArrowRight, FileText, Images, ListChecks } from "lucide-react";

import type { Product } from "@/lib/content";
import { cn } from "@/lib/utils";

const accentStyles = {
  emerald: "bg-emerald-500 text-white shadow-emerald-200",
  violet: "bg-violet-500 text-white shadow-violet-200",
  blue: "bg-blue-600 text-white shadow-blue-200",
};

export function ProductCard({ product }: { product: Product }) {
  const Icon = product.accent === "emerald" ? ListChecks : product.accent === "violet" ? FileText : Images;

  return (
    <article className="surface-panel group flex h-full flex-col rounded-2xl border border-slate-300/80 p-6 shadow-[0_18px_55px_rgba(9,30,66,.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(9,30,66,.13)]">
      <div className="flex items-start justify-between gap-4">
        <span className={cn("flex size-12 items-center justify-center rounded-xl shadow-lg", accentStyles[product.accent])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{product.statusLabel}</span>
      </div>
      <p className="mt-7 text-xs font-semibold uppercase tracking-[.14em] text-blue-600">{product.eyebrow}</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{product.name}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{product.shortDescription}</p>
      <div className="mt-auto pt-7">
        <Link href={"/software/" + product.slug} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-500">
          Product details <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm font-medium text-slate-800">{product.pricingLabel}</p>
      </div>
    </article>
  );
}
