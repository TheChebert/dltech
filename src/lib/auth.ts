import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/account");

  const { data: profile } = await supabase.from("profiles").select("id, display_name, role").eq("id", userId).maybeSingle();

  return {
    id: userId,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    displayName: profile?.display_name ?? null,
    role: profile?.role ?? "customer",
  };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/account/dashboard");
  return user;
}
