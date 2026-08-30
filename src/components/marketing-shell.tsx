import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
