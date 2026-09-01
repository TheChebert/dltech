# Licensing security model

## Assets and adversaries

Protected assets are signing authority, service-role database access, license-key validation, activation credentials, commerce issuance, and customer entitlement state. Expected adversaries include automated key guessing, copied local files, replayed requests, malicious clients, concurrent slot races, forged webhooks, database readers, and accidental secret disclosure.

Desktop clients are never trusted merely because they are signed applications. Server and database checks enforce all online state.

## Secrets

| Secret | Location | Rotation effect |
| --- | --- | --- |
| `SUPABASE_SECRET_KEY` | Website/server environment only | Rotate server access; no client change |
| `LICENSE_KEY_PEPPER` | Website/server environment only | Existing key hashes require a planned multi-pepper migration |
| `LICENSE_SIGNING_PRIVATE_KEY` | Website/server environment only | Publish new public key/key ID before signing with it |
| Commerce webhook secret | Provider worker only | Provider-specific overlap procedure |

Never prefix these with `NEXT_PUBLIC_`, commit them, expose them through an endpoint, or place them in a desktop bundle. Production and preview environments should be explicitly scoped in Vercel.

## License keys and activation tokens

- License keys contain 100 bits of random/deterministic HMAC-derived key material using an unambiguous alphabet.
- Postgres stores HMAC-SHA-256 only, plus non-secret prefix/suffix metadata for support lookup.
- The pepper prevents a database-only attacker from validating key guesses.
- Issuance deterministically reproduces a key from a server secret and canonical order/idempotency identity, enabling safe delivery retry without plaintext storage.
- Activation tokens are 256-bit random values, returned only to the activating client and stored as SHA-256 hashes. They are high entropy, so a pepper is not required for their at-rest hash.
- Refresh rotates tokens; deactivation destroys the usable token hash.

Logs and errors never include keys or activation tokens. API rate buckets use one-way hashes of supplied credentials.

## Signing

Ed25519 signing happens in the Next.js server process. Postgres stores only the SPKI public key and key lifecycle metadata. The token includes a key ID so multiple public keys can be trusted during rotation.

Rotation procedure:

1. Generate the next Ed25519 key pair in an approved secret environment.
2. Add its public key as a non-active/overlap record in a migration and ship SDK/app trust where keys are pinned.
3. Install the private key and key ID in server environments.
4. Promote the new key to active and retain the previous public key as retired until every entitlement it signed has passed `validUntil` plus clock tolerance.
5. Delete the old private key from active environments; later revoke/remove trust if required.

An emergency compromise sets the database key metadata to revoked, rotates server secrets, and forces online validation. The exact customer grace decision is an incident-response choice.

## Database authorization

- RLS is enabled on all licensing, entitlement, commerce, support, and operational tables.
- License state and issuance routines are revoked from `public`, `anon`, and `authenticated`; only `service_role` can execute them.
- Public reads are limited to published product/edition/feature/version/signing-key metadata.
- Customer policies expose only records owned by `auth.uid()` where applicable.
- Admin/support policies rely on server-controlled profile roles.
- Every security-definer function sets an empty search path and schema-qualifies objects.

Desktop apps do not receive even a Supabase publishable key for licensing operations. They use the website API only.

## Concurrency and invariants

Activation locks the license row before counting active installations. This is the invariant boundary; application-layer counts are not trusted. A rejected max-limit activation removes its just-created installation record. Issuance uses advisory locks plus unique idempotency/order constraints. Database constraints protect hash sizes, statuses, ownership, version scope, activation limits, and relational ownership.

## Replay, brute force, and abuse controls

- POST requests require a UUID nonce and signed-by-time request context within 300 seconds. Nonces are atomically consumed per route/product.
- IP and credential-scoped database rate limits are both applied before license work.
- Activation has the strictest limits; validation is more permissive for normal application fleets.
- License lookup errors do not reveal whether a syntactically valid key belongs to another customer.
- Request bodies are schema-limited by type and length.
- Maintenance deletes expired nonce and stale rate-bucket rows.

Nonce/timestamp controls stop accidental and captured-request replay; they do not authenticate an unactivated public client. High-entropy credentials, TLS, rate limits, and transactional server checks provide authentication and abuse resistance.

## Webhooks and issuance

Provider signature verification must use the raw body and constant-time comparison before database work. The generic event claim then enforces unique provider/event identity and payload consistency. Order/item uniqueness and issuance idempotency prevent a second license even if providers deliver semantically duplicate events with different event IDs.

Never mark an event processed until order persistence, issuance, and required delivery handoff succeed. Failed events are retryable; changed payloads for an existing event ID are security alerts.

## Privacy

The platform stores a hash of a random installation UUID and optional user-friendly device name/platform. It does not collect hardware serials, MAC addresses, disk IDs, file inventories, or other invasive fingerprints. Signed entitlements exclude email, order, IP, and internal database metadata.

API logs retain request ID, route, status, duration, IP (for operations/abuse controls), and relevant product/license IDs. Establish a retention job and access policy appropriate to Driftline's privacy notice before volume grows.

## Offline tradeoff

Offline grace intentionally delays enforcement of a new revocation during an outage or disconnected period. This is the usability/security tradeoff for legitimate perpetual desktop use. v1 defaults are configured per edition (MetaTweak Pro: refresh after 30 days, 14-day grace) and can be shortened for higher-risk products without protocol changes.

## Operational checks

- Alert on elevated `invalid_license`, `rate_limited`, issuance conflict, webhook payload conflict, and service-unavailable rates.
- Reconcile paid order items against one issuance record and one active/refunded entitlement.
- Review admin role changes and license status changes through audit logs.
- Run dependency, secret, RLS, migration, signature, and concurrency tests before release.
- Back up and periodically restore-test the Supabase database.
