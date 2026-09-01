import { handleLicensePost } from "@/lib/licensing/http";
import { refreshSchema } from "@/lib/licensing/schemas";
import { refreshLicense } from "@/lib/licensing/service";

export function POST(request: Request) {
  return handleLicensePost(request, {
    route: "/api/v1/licenses/refresh",
    schema: refreshSchema,
    ipLimit: 60,
    credentialLimit: 30,
    execute: refreshLicense,
  });
}
