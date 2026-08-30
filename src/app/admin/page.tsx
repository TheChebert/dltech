import type { Metadata } from "next";
import Link from "next/link";
import { Activity, KeyRound, MessageSquare, PackageCheck, Users } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const user = await requireAdmin();
  const supabase = createAdminClient();
  const [products, contacts, licenses, profiles] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("contact_submissions").select("*", { count: "exact", head: true }),
    supabase.from("licenses").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f9fd]">
      <header className="border-b border-slate-200 bg-white"><div className="page-shell flex h-20 items-center justify-between"><Link href="/"><BrandLogo className="h-auto w-[180px]" /></Link><span className="text-sm text-slate-500">Admin · {user.email}</span></div></header>
      <div className="page-shell py-12">
        <p className="section-kicker">Administration</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-slate-950">Platform overview</h1>
        <p className="mt-3 text-slate-600">Administrative access is enforced through the server and the profile role stored in Supabase.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={PackageCheck} label="Products" value={products.count ?? 0} />
          <Metric icon={Users} label="Profiles" value={profiles.count ?? 0} />
          <Metric icon={KeyRound} label="Licenses" value={licenses.count ?? 0} />
          <Metric icon={MessageSquare} label="Contact submissions" value={contacts.count ?? 0} />
        </div>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-7">
          <div className="flex items-center gap-3"><Activity className="size-5 text-blue-600" /><h2 className="text-xl font-semibold text-slate-950">Administrative foundation</h2></div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">The database and authorization foundation supports product, release, pricing, download, customer, entitlement, license, activation, support, contact, webhook, and audit records. Purpose-built management workflows can be added as real operating processes are defined.</p>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof PackageCheck; label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-6"><Icon className="size-5 text-blue-600" /><p className="mt-7 text-3xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>;
}
