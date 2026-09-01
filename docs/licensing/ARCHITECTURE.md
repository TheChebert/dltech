# Driftline Software Platform architecture

## Purpose

Supabase/Postgres is the system of record for Driftline product, commerce, entitlement, licensing, support, and operational records. Applications consume a single versioned application protocol; they never consume the database schema.

## Trust boundaries

1. **Desktop application** — untrusted client. It owns a random installation ID, stores its activation credential securely, and verifies signed entitlements with a public key.
2. **Driftline website API** — trusted policy boundary. It validates input, rate-limits, consumes nonces, calls service-role-only database routines, signs entitlements, and returns normalized envelopes.
3. **Supabase/Postgres** — authoritative state and concurrency boundary. It owns license status, limits, issuance idempotency, activation transactions, audit records, and RLS.
4. **Commerce webhook worker** — trusted server component. It claims a provider event, records the order, calls idempotent issuance, delivers the derived key, then completes the event.

The Ed25519 private key, license-key pepper, Supabase service-role key, and commerce webhook secrets exist only in server environments. The public Ed25519 key is intentionally distributable.

## Domain model

```text
product
├── platforms
├── versions ── download assets
├── features
├── editions ── edition features
└── prices ── order items ── orders
                     │
                     └── entitlement ── entitlement features
                              │
                              └── license ── activations ── installation
```

- `products.slug` is the stable application identifier; display names are never keys.
- `products.product_code` namespaces generic human-entered license keys.
- `product_editions` defines free, perpetual, or future subscription policy.
- `edition_features` is the template. `entitlement_features` is the purchased/issued snapshot, so later edition changes do not silently change an existing grant.
- `entitlements` expresses what an owner may use. An owner is an Auth user or normalized customer email.
- `licenses` is the activation credential and lifecycle state for an activation-required entitlement.
- `application_installations.installation_id_hash` stores SHA-256 of a client-generated UUID, not a hardware fingerprint.
- `license_activations` joins a license to an installation and stores only a hash of the opaque activation token.

Important business concepts remain relational. JSONB is limited to provider metadata, display metadata, and audit context.

## Activation transaction

`activate_license_v1` locks the matching license row before it evaluates status or counts active installations. All activations for one license therefore serialize in Postgres. The routine then:

1. verifies product, license, entitlement, and expiration state;
2. registers or locks the privacy-conscious installation record;
3. prevents cross-owner installation reuse where an owner exists;
4. rotates an existing active token, or counts active rows while the license lock is held;
5. rejects at the limit and removes any just-created inactive installation;
6. inserts/reactivates the activation and writes an audit record;
7. returns a database-internal state object to the trusted API.

The API converts that state into the public contract and signs it. The database never handles the private signing key.

## Validation, refresh, and deactivation

- **Validate** checks license, entitlement, installation, and activation-token hashes and updates last-seen timestamps.
- **Refresh** validates, atomically rotates the activation token, and returns a newly signed offline entitlement.
- **Deactivate** locks the activation, replaces its token hash with random revoked material, records timestamps/reason, and frees one active slot.
- **Transfer** is deactivation on the old installation followed by activation on the new installation. There is no hidden transfer bypass.

## Issuance and commerce

`issue_license_v1` uses an advisory transaction lock and an idempotency record. `order_item_id` is uniquely issuable. A retry returns the original license ID. The server derives the same high-entropy key from the product code and canonical order-item/idempotency identity, so a delivery retry can reproduce it without plaintext key storage.

Webhook processing is two-phase:

1. `claim_webhook_event_v1` inserts or locks the provider event and rejects payload changes for the same provider ID.
2. The worker records the order and calls idempotent issuance in its workflow.
3. `complete_webhook_event_v1` transitions the claimed event to processed, ignored, or failed.

Provider signature verification happens before claiming and is provider-specific; it is not part of the generic licensing protocol.

## Signed entitlement

The API serializes a compact three-part `header.payload.signature` token. Header and payload are base64url JSON. The Ed25519 signature covers their exact encoded bytes. The public payload contains only protocol/schema versions, issuer, product, edition, public license ID, hashed installation ID, license type, feature keys, version scope, activation limit, and time bounds.

`refreshAfter` is the normal online check time. `validUntil` includes the bounded offline grace. A service outage after `refreshAfter` does not immediately disable the app; operation stops only after `validUntil` or an earlier entitlement/license expiry.

## Versioning

- HTTP contract: `/api/v1`
- Envelope: `protocolVersion: 1`
- Signed payload: `schemaVersion: 1`
- Product registry: `license_protocol_version`
- Application release versions: independent semantic versions

Additive fields may be introduced within v1 when old clients can ignore them. Changed meaning, required-field removal, signature input changes, or incompatible error behavior requires a new protocol/API version. v1 endpoints and verification keys remain available for their documented support window.

## Reproducibility

All schema, policies, routines, key metadata, and initial MetaTweak registry data are deterministic migrations. Private keys and peppers are environment secrets and are never migrations or dashboard-only state.
