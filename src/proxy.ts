import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const publicLicensingRoutes = new Map<string, ReadonlySet<string>>([
  ["/api/v1/health", new Set(["GET"])],
  ["/api/v1/licensing/jwks", new Set(["GET"])],
  ["/api/v1/licenses/activate", new Set(["POST"])],
  ["/api/v1/licenses/validate", new Set(["POST"])],
  ["/api/v1/licenses/deactivate", new Set(["POST"])],
  ["/api/v1/entitlements/resolve", new Set(["POST"])],
]);

export async function proxy(request: NextRequest) {
  if (process.env.DRIFTLINE_API_ONLY === "true") {
    const methods = publicLicensingRoutes.get(request.nextUrl.pathname);
    if (!methods?.has(request.method)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/account") || request.nextUrl.pathname.startsWith("/admin")) {
    return updateSession(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
