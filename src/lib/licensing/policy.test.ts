import { describe, expect, it } from "vitest";

import { buildEntitlementTiming } from "./policy";

describe("entitlement timing policy", () => {
  it("uses an advisory refresh without a hard expiry for perpetual authorization", () => {
    expect(buildEntitlementTiming({ licenseType: "perpetual", refreshIntervalDays: 30, now: 1000 })).toEqual({
      refresh_after: 2_593_000,
      authorization: { kind: "perpetual", expires_at: null },
    });
  });

  it("keeps a hard authorization expiry for time-limited licenses", () => {
    const timing = buildEntitlementTiming({
      licenseType: "trial",
      refreshIntervalDays: 30,
      now: 1000,
      authorizationEndsAt: "1970-01-12T13:46:40.000Z",
    });
    expect(timing).toEqual({
      refresh_after: 1_000_000,
      authorization: { kind: "time_limited", expires_at: 1_000_000 },
      exp: 1_000_000,
    });
  });

  it("requires an authoritative end for a time-limited license", () => {
    expect(() => buildEntitlementTiming({ licenseType: "subscription", refreshIntervalDays: 30, now: 1000 })).toThrow(
      "time_limited_expiration_required",
    );
  });
});
