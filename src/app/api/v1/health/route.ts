import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const startedAt = Date.now();
  let database: "ok" | "unavailable" = "ok";

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("products").select("id", { count: "exact", head: true }).limit(1);
    if (error) database = "unavailable";
  } catch {
    database = "unavailable";
  }

  const healthy = database === "ok";
  return NextResponse.json({
    status: healthy ? "ok" : "degraded",
    services: { website: "ok", database },
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
  }, {
    status: healthy ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
