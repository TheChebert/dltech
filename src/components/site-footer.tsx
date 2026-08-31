import Link from "next/link";
import { Code2, Mail, Network } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";

const footerLinks = [
  {
    title: "Services",
    links: [
      ["Web design", "/services/web-design-development"],
      ["Custom software", "/services/custom-software"],
      ["Automation", "/services/automation-integrations"],
      ["AI solutions", "/services/ai-solutions"],
      ["Support", "/services/support-maintenance"],
      ["Consulting", "/services/technology-consulting"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Support", "/support"],
      ["System API", "/api/v1/health"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "/legal/privacy"],
      ["Terms", "/legal/terms"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#05101c] text-white">
      <div className="page-shell grid gap-12 py-16 lg:grid-cols-[1.35fr_2.65fr]">
        <div className="max-w-sm">
          <BrandLogo onDark variant="primary" className="h-auto w-[230px]" />
          <p className="mt-6 text-sm leading-6 text-slate-400">
            Thoughtful software, websites, automation, and technical systems built for real work.
          </p>
          <a href="mailto:hello@driftlinetech.com" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300">
            <Mail className="size-4" aria-hidden="true" /> hello@driftlinetech.com
          </a>
          <div className="mt-6 flex gap-3">
            <a href="https://github.com/TheChebert" target="_blank" rel="noreferrer" aria-label="Driftline Tech on GitHub" className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:border-sky-400/40 hover:text-sky-300">
              <Code2 className="size-4" aria-hidden="true" />
            </a>
            <span aria-label="LinkedIn profile coming soon" className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-600">
              <Network className="size-4" aria-hidden="true" />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <ul className="mt-5 space-y-3">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-400 hover:text-white">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="page-shell flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Driftline Tech, LLC. All rights reserved.</p>
        <p>Service scope and availability are confirmed during discovery.</p>
      </div>
    </footer>
  );
}