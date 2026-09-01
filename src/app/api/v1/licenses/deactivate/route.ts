import { deactivationSchema } from "@/lib/licensing/schemas";
import { handleLicensePost } from "@/lib/licensing/http";
import { deactivateLicense } from "@/lib/licensing/service";

export function POST(request: Request) {
  return handleLicensePost(request, {
    route: "/api/v1/licenses/deactivate",
    schema: deactivationSchema,
    ipLimit: 30,
    credentialLimit: 20,
    execute: deactivateLicense,
  });
}
