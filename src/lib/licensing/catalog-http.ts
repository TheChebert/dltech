import "server-only";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { apiFailure, apiSuccess } from "@/lib/api/responses";

import { loadLatestVersion, loadLicensingPolicy } from "./repository";
import { productSlugSchema } from "./schemas";

const channelSchema = z.enum(["stable", "beta", "alpha"]);
const publicCache = { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" };

export async function licensingPolicyResponse(slug: string) {
  const requestId = randomUUID();
  const parsedSlug = productSlugSchema.safeParse(slug);
  if (!parsedSlug.success) return apiFailure(requestId, "invalid_request", 400);

  try {
    const policy = await loadLicensingPolicy(parsedSlug.data);
    if (!policy) return apiFailure(requestId, "not_found", 404);
    return apiSuccess(requestId, policy, 200, publicCache);
  } catch {
    return apiFailure(requestId, "service_unavailable", 503, { retryable: true });
  }
}

export async function latestVersionResponse(request: Request, slug: string) {
  const requestId = randomUUID();
  const parsedSlug = productSlugSchema.safeParse(slug);
  const parsedChannel = channelSchema.safeParse(new URL(request.url).searchParams.get("channel") ?? "stable");
  if (!parsedSlug.success || !parsedChannel.success) return apiFailure(requestId, "invalid_request", 400);

  try {
    const result = await loadLatestVersion(parsedSlug.data, parsedChannel.data);
    if (!result) return apiFailure(requestId, "not_found", 404);
    return apiSuccess(requestId, {
      product: result.product,
      release: {
        version: result.version.version,
        majorVersion: result.version.major_version,
        channel: result.version.channel,
        releaseNotes: result.version.release_notes,
        minimumSupportedVersion: result.version.minimum_supported_version,
        critical: result.version.critical,
        publishedAt: result.version.published_at,
      },
    }, 200, publicCache);
  } catch {
    return apiFailure(requestId, "service_unavailable", 503, { retryable: true });
  }
}
