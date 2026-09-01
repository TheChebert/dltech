import { activationSchema } from "@/lib/licensing/schemas";
import { handleLicensePost } from "@/lib/licensing/http";
import { activateLicense } from "@/lib/licensing/service";

export function POST(request: Request) {
  return handleLicensePost(request, {
    route: "/api/v1/licenses/activate",
    schema: activationSchema,
    ipLimit: 20,
    credentialLimit: 10,
    successStatus: 201,
    execute: activateLicense,
  });
}
