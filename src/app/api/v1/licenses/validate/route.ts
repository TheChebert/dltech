import { handleLicensePost } from "@/lib/licensing/http";
import { validationSchema } from "@/lib/licensing/schemas";
import { validateLicense } from "@/lib/licensing/service";

export function POST(request: Request) {
  return handleLicensePost(request, {
    route: "/api/v1/licenses/validate",
    schema: validationSchema,
    ipLimit: 120,
    credentialLimit: 60,
    execute: validateLicense,
  });
}
