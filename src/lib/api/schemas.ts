import { z } from "zod";

export const licenseProofSchema = z.object({
  productSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  licenseKey: z.string().trim().min(16).max(160),
  deviceFingerprint: z.string().min(16).max(512),
  deviceName: z.string().trim().min(1).max(160).optional(),
  platform: z.string().trim().min(2).max(80),
  appVersion: z.string().trim().min(1).max(80),
  nonce: z.string().uuid(),
  timestamp: z.string().datetime({ offset: true }),
});

export const activationSchema = licenseProofSchema;

export const validationSchema = licenseProofSchema.extend({
  activationToken: z.string().min(32).max(256),
});

export const deactivationSchema = validationSchema.extend({
  reason: z.string().trim().max(240).optional(),
});

export type ActivationRequest = z.infer<typeof activationSchema>;
export type ValidationRequest = z.infer<typeof validationSchema>;
