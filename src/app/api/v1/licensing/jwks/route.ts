import { NextResponse } from "next/server";

import { getEntitlementJwks } from "@/lib/licensing/entitlements";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(getEntitlementJwks(), { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error("jwks_unavailable", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
