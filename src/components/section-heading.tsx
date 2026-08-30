import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({ eyebrow, title, description, align = "left", className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] text-[#0b1626] sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-pretty text-base leading-7 text-slate-600 sm:text-lg">{description}</p> : null}
    </div>
  );
}
