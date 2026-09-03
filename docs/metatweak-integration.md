# MetaTweak integration handoff

## Stable contract

- Product ID: `metatweak`
- Edition IDs: `free`, `pro`
- Contract: `contracts/products/metatweak.v1.json`
- SDK: `@driftline/licensing-sdk`
- API base: the deployed Driftline website origin

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
