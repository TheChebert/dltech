import { z } from "zod";

const stableId = z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/).max(120);
const proofFields = {
  productId: stableId,
  installationId: z.string().uuid(),
  platform: z.string().trim().min(2).max(80),
  appVersion: z.string().trim().min(1).max(80),
  nonce: z.string().uuid(),
  timestamp: z.string().datetime({ offset: true }),
};

export const activationSchema = z.object({
  ...proofFields,
  licenseKey: z.string().trim().min(24).max(200),
  deviceName: z.string().trim().min(1).max(160).optional(),
});

export const validationSchema = z.object({
  ...proofFields,
  activationToken: z.string().min(32).max(256),
});

export const deactivationSchema = validationSchema.omit({ appVersion: true }).extend({
  reason: z.string().trim().max(240).optional(),
});

export const freeEntitlementSchema = z.object({
  productId: stableId,
  editionId: stableId.default("free"),
  appVersion: z.string().trim().min(1).max(80),
});

export const checkoutSchema = z.object({
  productId: stableId,
  editionId: stableId,
});

export const checkoutStatusSchema = z.object({
  orderId: z.string().uuid(),
  accessToken: z.string().min(32).max(256),
});

export const manualIssueSchema = z.object({
  productId: stableId,
  editionId: stableId,
  customerEmail: z.string().email().max(320),
});

export type ActivationRequest = z.infer<typeof activationSchema>;
export type ValidationRequest = z.infer<typeof validationSchema>;
