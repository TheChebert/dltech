import type { Metadata } from "next";
import Link from "next/link";
import { Download, KeyRound, Laptop, PackageCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account Dashboard",
  robots: { index: false, follow: false },
};

export default async function AccountDashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: entitlements }, { data: licenses }, { data: activations }] = await Promise.all([
    supabase.from("entitlements").select("id, status, starts_at, ends_at, products(name, slug)").order("created_at", { ascending: false }),
    supabase.from("licenses").select("id, status, expires_at, max_activations, products(name, slug)").order("created_at", { ascending: false }),
    supabase.from("license_activations").select("id, device_name, platform, last_validated_at, deactivated_at").order("created_at", { ascending: false }),
  ]);

  return (
    <main className="surface-light min-h-screen text-slate-950">
      <header className="surface-panel border-b border-slate-300/80">
        <div className="page-shell flex h-20 items-center justify-between gap-6">
          <Link href="/" aria-label="Driftline Tech home"><BrandLogo variant="compact" className="h-auto w-[190px]" /></Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-500 sm:inline">{user.email}</span>
            <form action="/auth/signout" method="post"><button className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50">Sign out</button></form>
          </div>
        </div>
      </header>
      <div className="page-shell py-10 sm:py-14">
        <p className="section-kicker">Customer portal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.035em]">Welcome{user.displayName ? ", " + user.displayName : ""}.</h1>
        <p className="mt-3 text-slate-600">Your products, licenses, and active installations will appear here.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Metric icon={PackageCheck} label="Entitlements" value={entitlements?.length ?? 0} />
          <Metric icon={KeyRound} label="Licenses" value={licenses?.length ?? 0} />
          <Metric icon={Laptop} label="Active devices" value={activations?.filter((item) => !item.deactivated_at).length ?? 0} />
        </div>
        <section className="mt-8 surface-panel rounded-2xl border border-slate-300/80 p-6">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-xl font-semibold">Your products</h2><p className="mt-1 text-sm text-slate-500">Entitlements control license and download access.</p></div>
            <Download className="size-5 text-blue-600" />
          </div>
          {entitlements?.length ? (
            <div className="mt-6 divide-y divide-slate-100">
              {entitlements.map((item) => (
                <div key={item.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                  <div><p className="font-medium">{productName(item.products)}</p><p className="mt-1 text-sm text-slate-500">Status: {item.status}</p></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Entitled</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-6 rounded-xl bg-[#e5ecf3] p-5 text-sm text-slate-600">No product entitlements are attached to this account yet.</p>}
        </section>
      </div>
    </main>
  );
}

function productName(value: unknown) {
  if (Array.isArray(value)) return (value[0] as { name?: string } | undefined)?.name ?? "Product";
  if (value && typeof value === "object" && "name" in value) return String((value as { name: unknown }).name);
  return "Product";
}

function Metric({ icon: Icon, label, value }: { icon: typeof PackageCheck; label: string; value: number }) {
  return <div className="surface-panel rounded-2xl border border-slate-300/80 p-6"><Icon className="size-5 text-blue-600" /><p className="mt-7 text-3xl font-semibold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>;
}
