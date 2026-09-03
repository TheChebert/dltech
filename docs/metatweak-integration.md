# MetaTweak integration handoff

## Stable contract

- Product ID: `metatweak`
- Edition IDs: `free`, `pro`
- Licensing protocol/API: `v1`
- Contract: `contracts/products/metatweak.v1.json` (contract version `1`)
- SDK: `@driftline/licensing-sdk` version `1.0.0`
- Current non-production origin: `https://dltech-git-codex-licensing-v1-nonprod-chebert83-4946s-projects.vercel.app`

The current non-production origin is protected by Vercel Authentication. It is suitable for operator and automated verification through Vercel's server-side protection bypass, but a desktop client must not embed that bypass secret. Before MetaTweak performs network integration tests, expose the licensing routes through an approved non-production custom origin or protection exception, or temporarily change Preview protection under the operator checklist. Keep the entitlement issuer equal to the exact origin used by the client.

MetaTweak Free is a built-in local baseline. It must start on a first-ever offline launch with no token, account, license key, activation, internet, or JWKS. `/api/v1/entitlements/resolve` and SDK `resolveFree` are optional diagnostics/synchronization only. They must never gate Free startup or Free capabilities.

Generate one random UUID when MetaTweak is installed and persist it as the installation ID. Do not use a hardware serial, MAC address, username, or other fingerprint. When no valid paid entitlement is available, run the built-in Free baseline. Driftline's signed feature list only adds paid capabilities; it does not define or authorize the local Free baseline.

For Pro activation, send the license key once. Persist the opaque activation token, signed entitlement, and `verificationKeys` returned in the same response. On startup, evaluate that cached material locally. A valid perpetual certificate remains authorized after `refresh_after`; the app should attempt validation opportunistically and report a non-blocking refresh-due state. A timeout, DNS failure, 429, or 5xx preserves Pro and uses bounded retry. Remove Pro only after a definitive server response reports revocation, suspension, refund/invalid entitlement, or invalid/deactivated activation. Trials and subscriptions retain hard local expiry.

## Ready-to-use implementation prompt

```text
Read the Driftline MetaTweak contract at contracts/products/metatweak.v1.json and integrate only through @driftline/licensing-sdk. Use product ID "metatweak". Generate and persist one random installation UUID per installed app instance. Do not add Supabase access, Stripe access, database queries, a custom license format, activation counting, pricing, edition feature maps, private keys, or a Free entitlement dependency to MetaTweak.

Treat Free as a built-in local baseline available on the first-ever launch without network, token, account, license key, activation, or JWKS. Do not call resolveFree during startup and do not make /api/v1/entitlements/resolve a prerequisite. When no valid paid entitlement exists, immediately use the built-in Free baseline.

For Pro activation, send the user-entered key once through activate. Persist the returned opaque activation token, signed entitlement, and verificationKeys. On later launches, call resolveLocalAccess or evaluateEntitlementToken with the cached token and keys; do not fetch JWKS on every launch. Gate paid capabilities only with canonical feature IDs through hasFeature.

If the perpetual result is valid_perpetual, enable Pro. If it is refresh_due, keep Pro enabled and validate opportunistically. On validation timeout, DNS/network failure, 429, or 5xx, use classifyValidationFailure, keep Pro enabled as stale_but_authorized, and retry with bounded backoff. Remove Pro only after a definitive server denial such as license_revoked, license_suspended, entitlement_suspended, entitlement_refunded, or invalid_activation. Keep hard expiry for expired_time_limited trial/subscription certificates. Invalid signatures, product mismatch, and installation mismatch fall back to Free.

Support online deactivation with deactivate. Add tests for first-ever offline Free, no Free resolver call, valid perpetual, refresh due, prolonged outage, invalid/tampered tokens, time-limited expiry, three active installations, rejected fourth, deactivation, replacement activation, and definitive revocation/suspension. Do not change the platform protocol or copy its business rules into the app.
```

The feature IDs in contract version 1 are stable capability identifiers. The MetaTweak team maps them to actual UI/engine capabilities and reports any mismatch before release. The contract intentionally contains no price, activation-count value, Stripe identifier, license grant, or refresh timing; those remain platform configuration and require no MetaTweak rebuild.

## Actual non-production verification

On 2026-09-03, the deployed API and migrated non-production database were tested together using a disposable manually issued Pro license:

- Health returned HTTP 200 with both website and database healthy. JWKS returned one public Ed25519 verification key and no private key material.
- The optional Free resolver returned the expected Free feature set, but neither the contract nor SDK requires that request for Free startup or continued Free use.
- Manual issuance created one paid zero-dollar test order (`cb8a9671-b176-4d33-a57b-d9b8a83d34cc`), one succeeded test payment, one active entitlement, and perpetual license `6e301e5c-e2d4-4ee6-b74e-b5e20d1c72a8`. The database stores only a hash plus encrypted recovery material, not the returned plaintext key.
- Three installations activated, the next distinct installation received `activation_limit_reached`, deactivating one released its slot, and the replacement then activated. A later validation using a deliberately deactivated activation token returned `invalid_activation`.
- The live signed certificate verified with SDK `1.0.0` using only the returned token and cached JWKS. It was installation-bound, used `authorization.kind = perpetual`, had `authorization.expires_at = null`, omitted `exp`, and changed from `valid_perpetual` to authorized `refresh_due` when evaluated after `refresh_after`.
- Offline evaluation remained authorized while the server record was suspended or revoked. On reconnection, the API returned `license_suspended` or `license_revoked`, and the SDK classified each as a definitive denial. The disposable license was restored to active after those tests.
- Timeout/offline/DNS, HTTP 408, 429, 500, 502, and 503 classifications all preserved the cached perpetual authorization as `stale_but_authorized`. `Retry-After` was honored, with fallback retries at 1 hour, 6 hours, then no more than daily.

Stripe Test Product/Price IDs and Stripe server/webhook secrets are still intentionally absent, so real Checkout, webhook delivery, and webhook replay have not yet been claimed as tested. Follow `docs/stripe-test-setup.md` before using this environment for commerce validation.
