import { z } from "zod";

import { LICENSE_PROTOCOL_VERSION } from "../../../../packages/licensing-sdk/src/types";

const productSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const commonLicenseRequest = z.object({
  protocolVersion: z.literal(LICENSE_PROTOCOL_VERSION),
  productSlug,
  installationId: z.string().uuid(),
  platform: z.string().trim().min(2).max(80),
  appVersion: z.string().trim().regex(/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/).max(80),
  nonce: z.string().uuid(),
  timestamp: z.string().datetime({ offset: true }),
});

export const activationSchema = commonLicenseRequest.extend({
  licenseKey: z.string().trim().min(24).max(160),
  deviceName: z.string().trim().min(1).max(160).optional(),
});

export const activatedLicenseSchema = commonLicenseRequest.extend({
  licenseId: z.string().uuid(),
  activationToken: z.string().min(43).max(256),
});

export const validationSchema = activatedLicenseSchema;
export const refreshSchema = activatedLicenseSchema;
export const deactivationSchema = activatedLicenseSchema.extend({
  reason: z.string().trim().max(240).optional(),
});

export const productSlugSchema = productSlug;

export type ActivationInput = z.infer<typeof activationSchema>;
export type ActivatedLicenseInput = z.infer<typeof activatedLicenseSchema>;
export type DeactivationInput = z.infer<typeof deactivationSchema>;
