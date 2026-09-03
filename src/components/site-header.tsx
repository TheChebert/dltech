"use client";

import Link from "next/link";
import { Menu, Phone, X } from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Services", href: "/services" },
  { label: "Software", href: "/software" },
  { label: "La Crosse, WI", href: "/la-crosse-wi" },
  { label: "About", href: "/about" },
  { label: "Resources", href: "/support" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-50 border-b border-white/10 bg-[#06111e]/90 backdrop-blur-xl">
      <div className="page-shell flex h-20 items-center justify-between gap-8">
        <Link href="/" aria-label="Driftline Tech home" className="shrink-0">
          <BrandLogo onDark preload variant="compact" className="h-auto w-[200px] md:w-[230px]" />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href={`tel:${siteConfig.phoneE164}`} className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300 hover:text-sky-200">
            <Phone className="size-4" aria-hidden="true" /> {siteConfig.phoneDisplay}
          </a>
          <Link
            href="/contact"
            className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-lg bg-blue-600 px-5 text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500")}
          >
            Get in touch
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg border border-white/15 text-white lg:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <nav aria-label="Mobile navigation" className="page-shell absolute inset-x-0 top-20 border-b border-white/10 bg-[#071421] py-5 shadow-2xl lg:hidden">
          <div className="flex flex-col gap-1">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base font-medium text-slate-200 hover:bg-white/5">
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
              <a href={`tel:${siteConfig.phoneE164}`} onClick={() => setOpen(false)} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 text-sm font-medium text-white">
                <Phone className="size-4" aria-hidden="true" /> Call {siteConfig.phoneDisplay}
              </a>
              <Link href="/contact" onClick={() => setOpen(false)} className="flex h-11 items-center justify-center rounded-lg bg-blue-600 text-sm font-medium text-white">
                Get in touch
              </Link>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
