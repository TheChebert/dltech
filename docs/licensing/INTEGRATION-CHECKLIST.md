# Driftline app licensing checklist

Copy this checklist into a new Driftline application repository.

- [ ] Use one registry slug; never a display name.
- [ ] Use Driftline Licensing Protocol v1 and `https://driftlinetech.com/api/v1` only.
- [ ] Do not include Supabase credentials, signing private keys, license pepper, or webhook secrets.
- [ ] Generate and persist one random UUID v4 installation ID; do not fingerprint hardware.
- [ ] Bundle safe free-edition defaults for offline first launch.
- [ ] Use `@driftline/licensing` or a protocol-conformant port; do not hand-roll HTTP/signature logic per feature.
- [ ] Store activation tokens in OS-protected credential storage and replace token/entitlement atomically.
- [ ] Verify Ed25519 signature, key ID, issuer, protocol/schema, product, installation hash, version, and time bounds before enabling paid features.
- [ ] Refresh around `refreshAfter`; continue through transient outages only until `validUntil`.
- [ ] Treat network failure differently from revocation or invalid activation.
- [ ] Enforce feature keys and major-version scope locally.
- [ ] Respect normalized error codes and rate-limit retry guidance; never log keys/tokens.
- [ ] Deactivate before transfer; use authenticated support when the old installation is unavailable.
- [ ] Preserve customer data/read/export paths when an offline grant expires.
- [ ] Add valid, tampered, bad-key, copied-installation, refresh-due, expired, activation, deactivation, transfer, and crash-atomicity tests.
- [ ] Register editions/features/platforms/versions/prices through deterministic central migrations.
- [ ] Complete central contract, database, concurrency, and security checks before release.

Canonical references: [Protocol](./PROTOCOL.md), [Architecture](./ARCHITECTURE.md), [Security](./SECURITY.md), [App guide](./APP-INTEGRATION.md).
