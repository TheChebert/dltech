# Security model

## Implemented controls

- Row Level Security and least-privilege grants on every application table
- Server-only Supabase secret, Stripe secret, webhook secret, Ed25519 private key, AES key, and admin API key
- Raw-body Stripe signature verification before event parsing or processing
- Test/live environment matching and configured Stripe Price verification
- Database-backed event idempotency with payload-hash conflict detection and stale-claim recovery
- Transactional customer/payment/entitlement/license fulfillment
- SHA-256 license and installation lookup hashes
- AES-256-GCM authenticated encryption for recoverable license delivery
- Ed25519 signed offline entitlements with a public JWKS endpoint
- Opaque hashed activation tokens; validation does not resend the license key
- Atomic activation-limit enforcement under a license row lock
- Timestamp freshness, nonce replay protection, and route rate limits
- High-entropy, hashed checkout receipt tokens for license display
- Structured errors and logs that omit raw secrets and license keys
- Invite-only authentication, role checks, private release storage, security headers, and dependency gates

## Client prohibitions

Desktop and public client code must never contain Supabase secret/service keys, Stripe secret or webhook keys, the entitlement private key, the license encryption key, the admin API key, database queries, provider IDs, prices, activation limits, or edition feature maps. The public Supabase publishable key may be used only where RLS explicitly permits public reads.

## Key rotation

Entitlement key rotation requires a new `kid` and continued publication of every public key needed to verify active durable certificates. Because perpetual certificates do not hard-expire, retire an old verification key only through an explicit certificate migration/reissuance policy, never merely when `refresh_after` passes. License encryption-key rotation requires decrypt/re-encrypt migration before the previous key is removed. Stripe and Supabase secrets should be rotated using their provider controls and deployment secret store.

## Remaining production controls

- Restrict the manual issuance endpoint at the network edge and rotate its API key regularly.
- Add transactional email delivery and a customer portal before live customer sales.
- Configure durable alerts for repeated failed webhook events and incomplete fulfillment.
- Use separate Supabase and Stripe environments for staging and production.
- Obtain legal approval for privacy, terms, refunds, and the end-user license.
- Run authorization tests with customer, support, and admin identities plus an external security assessment.
