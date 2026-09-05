# Commerce and licensing validation matrix

| Requirement | Verification |
| --- | --- |
| First-ever Free launch is offline | `resolveLocalAccess` returns the built-in baseline with no token or keys and performs no HTTP operation. |
| Free resolver is optional | Contract, SDK, OpenAPI, platform guide, and MetaTweak handoff label it diagnostics/synchronization only. |
| Missing paid material falls back safely | No token, missing JWKS, invalid/tampered token, issuer/product mismatch, and installation mismatch return the local baseline. |
| Perpetual certificate is durable | Issuer omits hard `exp`; SDK reports `valid_perpetual` or authorized `refresh_due`. Legacy perpetual `exp` is interpreted as refresh timing. |
| Refresh policy is central | `product_editions.refresh_interval_days` sets `refresh_after`; MetaTweak Pro is initially configured for 30 days. |
| Outage does not disable perpetual software | Timeout, DNS/network error, 408, 429, and 5xx classify as `stale_but_authorized` with bounded retry. |
| Eventual revocation works | Definitive server responses distinguish revoked, suspended, refunded, and invalid/deactivated activation and remove paid authorization. |
| Time-limited expiry remains hard | Trial/subscription payloads require an authoritative end, include `exp`, and report `expired_time_limited` at that time. |
| Public keys are cached at activation | Activation and validation responses include `verificationKeys`; offline verification needs no launch-time JWKS request. |
| Free needs no purchase/key/activation | Free edition has `activation_required = false`, limit 0; local baseline does not use the edition resolver. |
| Pro is centrally configured as perpetual | Pro edition `license_type = perpetual`; license expiry is null. |
| Activation allowance is central | Atomic RPC locks the license and enforces the database-configured value; no client count is authoritative. |
| Deactivate/replacement works | Deactivation timestamps the activation and changes its token hash; atomic RPC no longer counts it. |
| Feature grants are platform-owned | `features` and `edition_features` rows build each signed paid feature list. The client contract has identifiers only. |
| Stripe mapping is external | Platform price row stores operator-provided Product/Price IDs; `metatweak` remains the internal product identity. |
| Success redirect cannot grant | Redirect only polls an order protected by a random hashed receipt token. Only webhook fulfillment marks paid. |
| Webhook delivery is secure and idempotent | Raw signature verification, claimed event IDs, row locking, and order-item-anchored fulfillment prevent forged or duplicate issuance. |
| Commercial values require no app build | Prices, activation limits, grants, provider IDs, license type, and refresh interval are database configuration absent from the MetaTweak v2 contract. |
| Cross-runtime policy cannot silently drift | TypeScript SDK 1.1.x and .NET SDK 1.0.x consume the same public-JWKS/token and failure-classification vectors. |
| Desktop origin needs no bypass secret | A separate API-only Vercel production domain exposes only native licensing routes; unrelated site/admin/commerce routes return 404. |
| MetaTweak contract is truthful | v2 replaces vague file-type and backup flags, deprecates unimplemented file attributes and broad advanced operations, and documents exact Free/Pro boundaries. |

Automated checks cover the policy state machine, time-limited and perpetual token behavior, signing, encryption, schema validation, types, linting, production build, browser routes, dependency audit, OpenAPI parsing, and SQL parsing.

On 2026-09-03, the real non-production Supabase and deployed API lifecycle passed manual issuance, activation-limit enforcement, deactivation/replacement, live signed-certificate verification through TypeScript SDK `1.0.0`, refresh-due/offline behavior, suspension, revocation, recovery, and deactivated-token denial.

On 2026-09-04, contract migration v2 was applied only to Driftline Licensing Nonprod and its transactional SQL validation completed successfully with rollback. Shared parity passed in TypeScript SDK 1.1.0 and .NET SDK 1.0.0; the native suite contains 40 passing tests.

On 2026-09-04, the dedicated `https://dltech-licensing-nonprod.vercel.app` API-only deployment passed public boundary verification under Vercel Standard Protection. Health and Ed25519 JWKS were public; generated deployment URLs remained protected; the website, admin issuance, Checkout, Stripe webhook, and unrelated routes returned 404. The first-party .NET SDK then completed a disposable real-API lifecycle against the public origin: all nine MetaTweak Pro grants matched contract v2, three installations activated, a fourth was rejected, cached-key offline and perpetual refresh-due authorization remained valid, one installation was deactivated and replaced, suspension and revocation produced authoritative denials, and all remaining activations were deactivated. Disposable license `c253cdcc-f2c3-42c7-b2ce-1e018706f46e` was left revoked with zero active activations. The isolated project retained no Vercel automation-bypass secret.

On 2026-09-03/04, the first complete Stripe Test Mode lifecycle also passed. Stripe Checkout created and paid a USD 14.99 one-time order; the verified webhook produced exactly one succeeded payment, active entitlement, and active perpetual license; replaying the same Stripe event produced no duplicates. Three installations activated, a fourth was denied with `activation_limit_reached`, one installation was deactivated and denied on validation, and the replacement installation then activated and validated. SDK `1.0.0` cryptographically evaluated the returned certificate as `valid_perpetual`, authorized, Pro, with no `exp` and no authorization end. Final deployed health reported both website and database `ok`, and the Stripe event had zero pending webhook deliveries.

Run `supabase/tests/commerce_entitlements.sql` against a migrated non-production database to exercise configuration, duplicate fulfillment, three activations, fourth-installation rejection, deactivation, and replacement activation in a transaction that rolls back.
