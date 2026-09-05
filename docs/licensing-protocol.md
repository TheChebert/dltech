# Driftline licensing protocol

- API version: `v1`
- Specification version: `1.1.0`
- Signed-token schema: `1`

Specification 1.1.0 keeps the v1 wire contract and adds mandatory exact issuer validation to supported client integrations plus shared TypeScript/.NET parity fixtures.

## Authorization model

Every product application owns a usable local baseline. For MetaTweak this is Free. The platform only supplies signed additive entitlements; missing, expired time-limited, invalid, or unverifiable paid material falls back to the local baseline. The optional Free resolver is not an authentication system and must not be in the startup critical path.

Paid activation returns three pieces of client state: an opaque activation token, a compact signed entitlement, and the public verification-key set. Store them together. The private signing key and database/commerce credentials never leave Driftline servers.

## Signed entitlement timing

All signed entitlements contain `iat`, `refresh_after`, and an `authorization` object.

- `authorization.kind = perpetual`: `expires_at` is null and `exp` is absent. `refresh_after` is advisory. A cryptographically valid installation-bound certificate continues to authorize paid capability while offline, even after refresh becomes due.
- `authorization.kind = time_limited`: `expires_at` is a Unix timestamp and matches the hard `exp`. Local paid access ends at that time even without a server response.

For compatibility, the SDK treats a previously issued perpetual token's legacy `exp` as its refresh-due time rather than a hard authorization end. It continues to treat legacy non-perpetual `exp` as hard expiry.

## Startup and refresh state machine

1. No paid token: return the local baseline immediately; make no network call.
2. Paid token without cached verification keys: return the local baseline; activation should have stored the keys.
3. Invalid signature, token/key structure, issuer, product, or installation binding: return the local baseline as invalid/tampered.
4. Valid perpetual before refresh: `valid_perpetual`, authorized.
5. Valid perpetual after refresh: `refresh_due`, still authorized; begin opportunistic validation.
6. Valid time-limited before expiry: `valid_time_limited`, authorized.
7. Time-limited at/after expiry: `expired_time_limited`, not authorized.

## Online validation outcomes

- Success: atomically replace the cached entitlement and verification keys; reset the refresh window from current central configuration.
- Timeout, DNS/network error, HTTP 408, 429, or 5xx: keep an already valid perpetual certificate authorized as `stale_but_authorized`; retry after 1 hour, then 6 hours, then at most daily. Honor `Retry-After` when provided.
- Definitive 401/403 server denial: remove paid authorization. Specific states include revoked, suspended, refunded, invalid/deactivated activation, expired time-limited license, and other authoritative denials.
- Deactivation: requires a successful online call. After success, clear the local activation token, entitlement, and cached paid state. A later validation with that token returns `invalid_activation`.

Refresh scheduling and license policy are generic edition configuration. A product contract contains identifiers and integration boundaries, not prices, activation limits, provider IDs, paid grants, or timing values.

## Verification requirements

Verify the compact token signature before trusting its JSON payload. Accept only header `alg=EdDSA`, `typ=DLT-ENTITLEMENT+jwt`, and `v=1`, and only an exact cached public JWK match for `kid`, `kty=OKP`, `crv=Ed25519`, `alg=EdDSA`, and `use=sig`. Then validate schema, exact configured issuer, product/audience, issued-at skew, and installation binding. Public-key caching is supported; private signing material is never distributed.

## Supported clients

- `@driftline/licensing-sdk` 1.1.x implements this specification for TypeScript/ESM runtimes.
- `Driftline.Licensing` 1.0.x implements this specification for .NET 8.
- Both suites consume `contracts/licensing/protocol-v1.test-vectors.json`. API v1 or token schema v1 does not imply parity for an untested client implementation.
