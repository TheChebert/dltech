# Driftline platform behavior

## Canonical ownership

Driftline owns product identity, editions, feature definitions, paid edition grants, prices, provider mappings, customers, orders, payments, entitlements, licenses, installations, activations, releases, and audit history. Product applications consume the versioned API and `@driftline/licensing-sdk`; they never query platform tables or Stripe.

MetaTweak is the first configured product. Its stable ID is `metatweak`. Free and Pro are ordinary platform editions, not MetaTweak-specific code paths. Current price, activation allowance, license type, feature grants, Stripe mappings, and refresh interval are rows in central configuration, not values in the MetaTweak v1 contract.

## Commerce lifecycle

1. The website sends only stable product and edition IDs.
2. The server loads the active platform-owned price and Stripe Test Price mapping.
3. The server creates a pending order and Stripe Checkout Session.
4. Stripe redirects the browser for customer experience only; the redirect grants nothing.
5. `/api/v1/webhooks/stripe` verifies the raw payload with the Stripe signature and endpoint secret.
6. The handler retrieves the Checkout Session with line items and verifies mode, payment state, environment, order reference, currency, amount, quantity, and configured Price ID.
7. A database function transactionally reconciles the customer, successful payment, entitlement, and license.
8. The browser retrieves the issued license only with the high-entropy order access token created before checkout.

Webhook event IDs are claimed with a row lock. Repeated or concurrent delivery cannot create a second entitlement or license. Failed events can be retried, and abandoned processing claims become reclaimable after five minutes.

## Licensing lifecycle

- Built-in Free: applications start in their local Free baseline. No platform call, account, key, activation, token, internet, or JWKS is required. `/api/v1/entitlements/resolve` is optional diagnostics/synchronization and never authorizes the baseline.
- Activate: submit product ID, license key, persisted random installation UUID, platform, app version, nonce, and timestamp. The server hashes the installation UUID, atomically enforces the configured activation limit, and returns an opaque activation token, signed entitlement, and public verification keys to cache together.
- Validate: submit the activation token instead of the license key. The server checks current license, entitlement, installation, and product state, then returns refreshed signed material and public keys.
- Deactivate: submit the activation token and installation UUID while online. The slot is released immediately; a replacement installation can activate.
- Offline: verify the compact Ed25519 token using the cached keys. Check signature, schema version, audience/product, installation binding, authorization kind, and feature IDs.

## Perpetual offline policy

Perpetual activation issues an installation-bound signed durable authorization certificate. It has no hard local `exp`. The centrally configured `refresh_after` is freshness metadata, initially 30 days for MetaTweak Pro, not an authorization deadline.

At or after `refresh_after`, keep perpetual paid capabilities enabled and attempt validation opportunistically. Timeout, DNS/network failure, 429, and 5xx responses preserve authorization and schedule bounded retries. A prolonged licensing-service outage therefore leaves a cryptographically valid perpetual installation authorized. A definitive successful server response reporting revocation, suspension, refund/invalid entitlement, or invalid/deactivated activation removes paid authorization. This permits eventual revocation without turning a perpetual purchase into a subscription.

Trials and subscriptions are different: their signed certificates contain an authoritative end and `exp`, and lose paid access locally when that time passes.

## Key material

License lookups use SHA-256 hashes. The original key is retained only as AES-256-GCM ciphertext so verified checkout and future customer-portal delivery can recover it. The encryption key never leaves the server. Offline entitlements use an Ed25519 private key on the server; only public JWKs are returned and published.

## Authentication and administration

Supabase sign-in is invite-only. Browser clients receive only the project URL and publishable key. Row Level Security remains enabled on every application table. The manual issuance endpoint requires a separate server-only admin API key and should be exposed only to trusted operators.

## Canonical resources

- Licensing protocol: `docs/licensing-protocol.md`
- Machine contract: `contracts/products/metatweak.v1.json`
- Client SDK: `packages/licensing-sdk`
- HTTP contract: `docs/openapi.yaml`
- Stripe setup and lifecycle checklist: `docs/stripe-test-setup.md`
- MetaTweak handoff: `docs/metatweak-integration.md`
- Validation matrix: `docs/validation-matrix.md`
