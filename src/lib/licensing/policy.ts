export type EntitlementTiming = {
  refresh_after: number;
  authorization: {
    kind: "perpetual" | "time_limited";
    expires_at: number | null;
  };
  exp?: number;
};

export function buildEntitlementTiming(input: {
  licenseType: string;
  refreshIntervalDays: number;
  now: number;
  authorizationEndsAt?: string | null;
}): EntitlementTiming {
  const refreshAfter = input.now + input.refreshIntervalDays * 86400;
  if (input.licenseType === "perpetual") {
    return {
      refresh_after: refreshAfter,
      authorization: { kind: "perpetual", expires_at: null },
    };
  }

  if (!input.authorizationEndsAt) throw new Error("time_limited_expiration_required");
  const expiresAt = Math.floor(new Date(input.authorizationEndsAt).getTime() / 1000);
  if (!Number.isFinite(expiresAt)) throw new Error("time_limited_expiration_invalid");

  return {
    refresh_after: Math.min(refreshAfter, expiresAt),
    authorization: { kind: "time_limited", expires_at: expiresAt },
    exp: expiresAt,
  };
}
