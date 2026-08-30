import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServerEnv } from "@/lib/env";

export function createAdminClient() {
  const { url, secretKey } = getSupabaseServerEnv();
  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
