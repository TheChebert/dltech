# @driftline/licensing-sdk

This package is the reusable client boundary for Driftline product licensing. Applications provide only their stable product ID, a persisted random installation UUID, platform, app version, and—for paid activation—a customer license key.

## Local-first access

Free capability is an application-owned baseline. A first-ever launch with no network, token, account, license key, activation, or JWKS calls `resolveLocalAccess` and receives `baseline`. The optional `resolveFree` API remains available for diagnostics or synchronization; it is never an authorization prerequisite.

Successful paid activation and validation return the signed entitlement and its public `verificationKeys` together. Persist both, then use `evaluateEntitlementToken` or `resolveLocalAccess` on later launches without fetching JWKS.

## Perpetual and time-limited authorization

- Perpetual certificates have no hard local authorization expiry. `refresh_after` is an advisory validation schedule. After it passes, evaluation returns `refresh_due` with `authorized: true`.
- Trials, subscriptions, and other time-limited certificates carry a hard authorization end and `exp`. After it passes, evaluation returns `expired_time_limited`.
- `classifyValidationFailure` returns `stale_but_authorized` for network errors, timeouts, rate limits, and server failures. It returns a removal decision only for a definitive server denial such as revocation, suspension, refund, or invalid activation.

The package contains no Stripe IDs, database credentials, Supabase access, signing secrets, prices, activation counts, or product-specific feature grants.

Build with `npm run build -w @driftline/licensing-sdk`.
