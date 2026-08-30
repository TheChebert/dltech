# Platform behavior

## Authentication

Sign-in uses Supabase passwordless email links. The callback exchanges the authorization code for a secure session and sends the user to the account dashboard. The first login creates a customer profile through a database trigger.

## Customer account

The account dashboard is the authenticated foundation for orders, entitlements, license management, downloads, and support history. Queries are scoped to the signed-in user and protected again by Row Level Security.

## Administration

The admin route requires the admin role stored in the profile table. Support and admin interfaces can expand without weakening this boundary. Role changes should be audited through a trusted administrative workflow.

## Product catalog and releases

Products have lifecycle status, features, supported platforms, versions, downloads, and prices. Public pages show only published records. Seeded products are labeled planned and are not presented as purchases.

Release files belong in the private product-releases bucket. A production download workflow must verify an active entitlement, log the request, and return a short-lived signed URL.

## Licensing API

Version one exposes:

- GET /api/v1/health
- GET /api/v1/products/{slug}/releases/latest
- POST /api/v1/licenses/activate
- POST /api/v1/licenses/validate
- POST /api/v1/licenses/deactivate

Activation and validation enforce license status, entitlement state, product match, activation limit, timestamp freshness, nonce uniqueness, and rate limits.

## Contact and support

The contact form validates fields, records consent, includes a honeypot, and rate limits submissions. The server performs database writes so the public browser receives no table write permission. Support article and ticket tables are ready for a future authenticated interface.

## Commerce integration contract

Before checkout is enabled:

1. Select the payment provider and approve prices, taxes, refunds, and subscription rules.
2. Create checkout sessions only on the server.
3. Verify signed webhooks against the raw request body.
4. store the provider event id and reject duplicate processing.
5. Grant or revoke entitlements transactionally.
6. Generate license keys once, store only a hash, and deliver the raw key through an authenticated channel.
7. Add provider sandbox tests and operational alerts.

## Content guidance

Metrics, testimonials, customer logos, and portfolio examples require approved evidence. Current work cards are explicitly illustrative concepts. Legal pages are operational drafts requiring counsel approval.
