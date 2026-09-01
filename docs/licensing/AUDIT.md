# Driftline Software Platform audit

Audit date: 2026-09-01
Target: the linked `Driftline Tech` Supabase project and this repository

## Executive finding

The existing project was a sound preliminary platform schema, not yet a safe application licensing contract. It already separated public product data, orders, entitlements, licenses, installations, API logs, webhooks, support, and audit records. The correct path was additive normalization rather than replacement.

The v1 implementation keeps that foundation and adds the missing domain model, transactional routines, signed entitlement contract, canonical API, and reference SDK. No existing production row is deleted or rewritten outside deterministic compatibility backfills.

## State reviewed

- The three baseline migrations matched remote at audit start. Before deployment validation, remote also contained `20260831010000_ebay_marketplace_account_deletions`; its exact migration from the existing EzeBay feature branch was reconciled into this branch rather than repairing or rewriting remote history.
- The linked Supabase project was the only project in the Driftline Tech organization and was healthy.
- Remote aggregate counts contained three planned product records and eighteen product features.
- Product versions, prices, orders, order items, entitlements, licenses, installations, activations, API clients, webhook events, API logs, audit logs, and support tickets had no production rows at audit time.
- Existing public products were `ezebay-listing-manager`, `easy-file-editor`, and `viewsaic`; none was purchase-enabled.
- The local seed configuration referenced a missing `supabase/seed.sql`.
- Supabase Auth still used the former Vercel URL as its primary site URL.

Only aggregate counts and schema metadata were inspected. Customer content and credentials were not exported.

## Useful existing work retained

- Stable product slugs and normalized product/version/platform/feature tables.
- Order and order-item separation from entitlements and licenses.
- Installation and activation records.
- RLS, admin/support helper functions, server-only Supabase client, audit logs, API request logs, nonce storage, rate-limit buckets, and webhook event storage.
- Storage policies and public product-content policies.
- Deterministic migration history.

## Gaps found

| Area | Preliminary state | Risk | v1 resolution |
| --- | --- | --- | --- |
| Edition model | Free/paid policy was free text on products | Apps could interpret licensing differently | `product_editions` with typed license, account, activation, version, refresh, and grace policies |
| Features | Display titles were the only feature identity | Renames could break applications | Immutable `feature_key` plus relational edition/entitlement feature joins |
| Product identity | Slug only; no compact key namespace | License format would become product-specific | Stable `product_code` used only by the generic key generator |
| Entitlements | User required; version policy free text | No accountless purchase/free model and weak validation | Account-or-email owner, typed license/version scope, edition, activation limit, relational features |
| License keys | Raw SHA-256 and no pepper | Offline guessing/brute force exposure | HMAC-SHA-256 with server-only pepper, prefix/suffix metadata, no plaintext storage |
| Activation | Route performed read-count-write in separate requests | Concurrent requests could exceed the limit | Row-locked `activate_license_v1` transaction and rollback-safe installation handling |
| Validation | License key resent and raw database shape returned | Greater key exposure and unstable contract | Opaque activation credential plus signed, versioned entitlement |
| Offline use | No signature or grace model | Outage immediately affected legitimate users | Ed25519 entitlement with refresh and bounded offline grace |
| Replay defense | Direct nonce insert in route | Inconsistent cleanup and race behavior | Atomic nonce-consumption function and timestamp tolerance |
| Issuance | No idempotent workflow | Duplicate webhooks could create duplicate licenses | Transactional issuance request, unique order item, deterministic retry key |
| Webhooks | Unique event table only | Retry state transitions were ad hoc | Atomic claim/complete functions and payload-conflict detection |
| API | Activate/validate/deactivate and release endpoint had unrelated shapes | Every app would need custom logic | Stable protocol-v1 envelopes, refresh/policy/version endpoints, shared handler |
| SDK | None | Signature and error behavior would be reimplemented per app | `@driftline/licensing` reference client and language-neutral protocol |
| Configuration | Seed missing; old auth domain | Reproduction and auth redirect drift | No-op seed plus canonical and `www` domain redirect configuration |

## Security findings

- Service-role credentials were already server-only and remain so.
- Desktop applications must not receive Supabase publishable or service credentials; the SDK speaks only to `/api/v1`.
- Preliminary activation count enforcement was vulnerable to a time-of-check/time-of-use race. The database now serializes activation changes by locking the license row.
- License keys require both high-entropy generation and a server-side pepper. Database compromise alone is insufficient to validate guessed keys.
- Activation tokens are random, stored only as hashes server-side, rotated on refresh, and destroyed on deactivation.
- The signed payload intentionally contains no customer email, order ID, hardware serial, database entitlement ID, or internal metadata.
- Public errors are normalized to avoid license-status enumeration beyond what a holder of a valid activation needs to know.

## Scope deliberately not added

- No billing-provider-specific subscription engine.
- No purchase UI or active MetaTweak price. The tentative $14.99 record is inactive until commerce approval.
- No invasive hardware fingerprinting.
- No desktop dependency on Supabase tables or generated database types.
- No automatic application shutdown at the first failed refresh.

## Production review decision

The licensing and commerce tables had no remote production data, so the additive migration is low-risk. Deployment still requires the normal dry run, automated checks, server secret installation, migration application, and endpoint smoke tests described in [TESTING.md](./TESTING.md).
