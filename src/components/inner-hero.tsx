import type { ReactNode } from "react";

type InnerHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function InnerHero({ eyebrow, title, description, actions }: InnerHeroProps) {
  return (
    <section className="hero-grid relative overflow-hidden border-b border-white/10 bg-[#06111e] py-20 text-white sm:py-28">
      <div className="hero-glow" aria-hidden="true" />
      <div className="page-shell relative">
        <p className="section-kicker">{eyebrow}</p>
        <h1 className="mt-4 max-w-5xl text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.05em] sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-pretty text-lg leading-8 text-slate-300">{description}</p>
        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
