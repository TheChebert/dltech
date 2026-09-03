# Commerce and licensing validation matrix

| Requirement | Verification |
| --- | --- |
| First-ever Free launch is offline | `resolveLocalAccess` returns the built-in baseline with no token or keys and performs no HTTP operation. |
| Free resolver is optional | Contract, SDK, OpenAPI, platform guide, and MetaTweak handoff label it diagnostics/synchronization only. |
| Missing paid material falls back safely | No token, missing JWKS, invalid/tampered token, product mismatch, and installation mismatch return the local baseline. |
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
| Commercial values require no app build | Prices, activation limits, grants, provider IDs, license type, and refresh interval are database configuration absent from the MetaTweak v1 contract. |

Automated checks cover the policy state machine, time-limited and perpetual token behavior, signing, encryption, schema validation, types, linting, production build, browser routes, dependency audit, OpenAPI parsing, and SQL parsing. A real Stripe/Supabase lifecycle requires the operator-supplied Test Mode IDs and secrets in `stripe-test-setup.md`.

Run `supabase/tests/commerce_entitlements.sql` against a migrated non-production database to exercise configuration, duplicate fulfillment, three activations, fourth-installation rejection, deactivation, and replacement activation in a transaction that rolls back.
