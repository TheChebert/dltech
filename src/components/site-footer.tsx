import Link from "next/link";
import { Mail, Phone } from "lucide-react";

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
      ["Start a project", "/contact?topic=project"],
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
          <div className="mt-5 flex flex-col items-start gap-3">
            <a href="mailto:hello@driftlinetech.com" className="inline-flex items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300">
              <Mail className="size-4" aria-hidden="true" /> hello@driftlinetech.com
            </a>
            <a href="tel:+16085020949" className="inline-flex items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300">
              <Phone className="size-4" aria-hidden="true" /> 608-502-0949
            </a>
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
        <p>Websites, applications, and connected systems built with clarity and care.</p>
      </div>
    </footer>
  );
}
