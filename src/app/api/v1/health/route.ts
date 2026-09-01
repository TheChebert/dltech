import { randomUUID } from "node:crypto";

import { apiSuccess } from "@/lib/api/responses";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const requestId = randomUUID();
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
  return apiSuccess(requestId, {
    status: healthy ? "ok" : "degraded",
    services: { website: "ok", database },
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
  }, healthy ? 200 : 503);
}
