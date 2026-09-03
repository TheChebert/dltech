# Architecture

## System boundary

```text
Website / operator / desktop app
          |
          v
Versioned Driftline API + reusable SDK
          |
          +-- public catalog and JWKS
          +-- server-only commerce and fulfillment
          +-- server-only licensing and signing
          |
          v
Supabase Postgres + Auth + private release storage
          ^
          |
Verified Stripe Checkout webhooks
```

The platform is generic by construction. Tables and routes describe products, editions, features, grants, prices, orders, payments, entitlements, licenses, and installations. MetaTweak contributes configuration rows and a versioned contract only.

## Trust boundaries

- Public website: may read published catalog data and request checkout; it cannot choose price or fulfillment rules.
- Desktop application: stores a random installation UUID, activation token, and signed entitlement. It has no Supabase or Stripe credential.
- API server: owns secret-key database access, Stripe API use, license encryption, and entitlement signing.
- Stripe webhook: is untrusted until raw-body signature verification succeeds.
- Database functions: serialize activation-limit enforcement, webhook claims, and order fulfillment.

## Data flow

Checkout records an order and its exact edition/price selection before contacting Stripe. Fulfillment uses the stored order item as the expected state and compares it with the retrieved Stripe Session. The fulfillment function row-locks the order and uses order-item identity as the idempotency anchor.

Activation hashes the app-generated installation UUID before storage. A license row lock serializes counting and activation. Validation relies on the scoped opaque activation token, not repeated transmission of the customer license key.

## Repository layout

- `src/app` — pages and versioned route handlers
- `src/lib/commerce` — generic checkout, payment, and order operations
- `src/lib/licensing` — generic signing and license-key protection
- `packages/licensing-sdk` — app-facing protocol and offline verification
- `contracts/products` — versioned machine contracts
- `supabase/migrations` — schema, RLS, transactional functions, and product configuration
- `docs` — operating, API, setup, security, and integration guidance

## Failure model

Sensitive paths fail closed on database, signature, mapping, key, or configuration failures. Checkout creation marks an unfinished order failed if Stripe Session creation fails. Webhook failures are recorded and can be retried. A checkout redirect never changes order, payment, entitlement, or license state.
