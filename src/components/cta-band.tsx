import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaBandProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function CtaBand({
  eyebrow = "Start a conversation",
  title = "Have a product, workflow, or website that needs a better path forward?",
  description = "Tell us what is changing, what is getting in the way, and what a successful next step would look like.",
}: CtaBandProps) {
  return (
    <section className="bg-[#071522] py-20 text-white">
      <div className="page-shell grid items-center gap-8 rounded-2xl border border-sky-400/20 bg-gradient-to-br from-blue-600/15 via-[#0a1d30] to-cyan-400/5 p-8 shadow-2xl shadow-slate-950/20 sm:p-12 lg:grid-cols-[1fr_auto]">
        <div className="max-w-3xl">
          <p className="section-kicker">{eyebrow}</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
        </div>
        <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-lg bg-blue-600 px-6 text-base text-white hover:bg-blue-500")}>
          Get in touch <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
