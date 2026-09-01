# Driftline Application Licensing Protocol v1

Canonical origin: `https://driftlinetech.com`

API prefix: `/api/v1`

Protocol version: `1`

This is the language-neutral contract for every Driftline application. Database rows, Supabase generated types, and display copy are not part of this contract.

## Common response envelope

Success:

```json
{
  "protocolVersion": 1,
  "requestId": "8b0b47e3-25a4-48e8-ad60-e4ed03901975",
  "ok": true,
  "data": {}
}
```

Failure:

```json
{
  "protocolVersion": 1,
  "requestId": "8b0b47e3-25a4-48e8-ad60-e4ed03901975",
  "ok": false,
  "error": {
    "code": "invalid_license",
    "message": "The license could not be verified.",
    "retryable": false
  }
}
```

Clients branch on `code`, never message text. Licensing POST responses use `Cache-Control: no-store`. Public policy/version GET responses may be cached briefly.

## Product identification

Each app compiles one stable lowercase product slug, for example `metatweak`. It sends that slug on every operation and rejects a signed entitlement for any other product. Display names and compact product codes are not application identifiers.

## Installation ID

On first launch, generate a cryptographically random UUID v4 and persist it. This identifier represents the app installation, not a person or physical device. Do not derive it from a serial number, MAC address, disk ID, hostname, account, or other hardware fingerprint. A reinstall may create a new ID and therefore consume a new slot until the old installation is deactivated.

The API hashes the UUID before storage. Signed entitlements include that SHA-256 hash so a copied entitlement will not verify for another installation ID.

## Request context

All licensing POST bodies include:

```json
{
  "protocolVersion": 1,
  "productSlug": "metatweak",
  "installationId": "f07cdce0-60f3-4549-bfeb-28542e6a44df",
  "platform": "windows-x64",
  "appVersion": "1.0.0",
  "nonce": "011b5c4d-0e7a-4a99-82dd-b984aa923f53",
  "timestamp": "2026-09-01T12:00:00.000Z"
}
```

The nonce is a new UUID per attempt. Timestamp tolerance is advertised by product policy and is currently 300 seconds. Retrying creates a new nonce and timestamp.

## Product policy

`GET /api/v1/products/{product_slug}/licensing`

Returns product identity, active editions, feature keys, activation/account rules, version entitlement defaults, current Ed25519 verification key, and request policy.

For a free edition with `activationRequired: false`, the app constructs its local free state from this policy and its compiled safe defaults. It does not call activation and does not need an account or network connection. Bundled defaults are essential for first launch while offline; refresh policy opportunistically when online.

## Activate

`POST /api/v1/licenses/activate`

Adds `licenseKey` and optional `deviceName` to the request context. A successful response has HTTP 201 and returns:

```json
{
  "licenseId": "250c4f76-0f23-4580-a21a-c4a7ee5ac1d7",
  "activationToken": "opaque-secret-returned-once-per-rotation",
  "signedEntitlement": "base64url-header.base64url-payload.base64url-signature",
  "entitlement": {
    "schemaVersion": 1,
    "protocolVersion": 1,
    "issuer": "https://driftlinetech.com",
    "product": "metatweak",
    "edition": "pro",
    "licenseId": "250c4f76-0f23-4580-a21a-c4a7ee5ac1d7",
    "installationIdHash": "64-lowercase-hex-characters",
    "licenseType": "perpetual",
    "features": ["core", "pro"],
    "versionEntitlement": { "scope": "major", "majorVersion": 1 },
    "activationLimit": 3,
    "issuedAt": "2026-09-01T12:00:00.000Z",
    "refreshAfter": "2026-10-01T12:00:00.000Z",
    "validUntil": "2026-10-15T12:00:00.000Z",
    "entitlementExpiresAt": null
  }
}
```

`entitlement` is included for convenience but is not trusted until the app verifies `signedEntitlement` and confirms both objects agree. The reference SDK always verifies before storage.

## Validate

`POST /api/v1/licenses/validate`

Adds `licenseId` and `activationToken` to the request context. It confirms online state, updates validation timestamps, and returns a fresh signed grant. It does not rotate the activation token.

## Refresh

`POST /api/v1/licenses/refresh`

Uses the validate request body. It validates current state, rotates the activation token, and returns a new signed grant. The client atomically replaces its stored token and entitlement only after verifying the new signature.

## Deactivate and transfer

`POST /api/v1/licenses/deactivate`

Uses the activated request body and optional `reason`. Success returns `{ "deactivated": true, "deactivatedAt": "..." }`. The client then deletes its local activation token and signed entitlement.

A transfer is explicit: deactivate the old installation, then activate the new installation with the license key. If the old device is unavailable, support/admin may revoke the old activation after verifying ownership; there is no unauthenticated reset endpoint.

## Latest application version

`GET /api/v1/products/{product_slug}/versions/latest?channel=stable`

Channels are `stable`, `beta`, or `alpha`. The response contains semantic version, major version, notes, minimum supported version, critical flag, and publication time. No published release returns the normal `not_found` envelope.

## Signed entitlement verification

1. Split the token into exactly three non-empty parts.
2. Decode base64url header and payload as UTF-8 JSON.
3. Require header `{ "alg": "EdDSA", "typ": "DLT+LICENSE", "kid": trustedKeyId }`.
4. Verify Ed25519 over the ASCII bytes of `encodedHeader + "." + encodedPayload` using the trusted SPKI public key.
5. Validate every payload type and timestamp.
6. Require issuer, protocol/schema version, product slug, and SHA-256 installation hash to match.
7. Enforce version scope and feature keys.
8. Treat the grant as normal before `refreshAfter`, refresh-due until `validUntil`, and unusable at/after `validUntil` or earlier entitlement expiry.

Never trust the decoded payload before signature verification.

## Local storage

- Store installation ID durably.
- Store activation token in platform credential storage (Windows Credential Manager, macOS Keychain, or an equivalent protected secret store).
- Store the signed entitlement and signing-key metadata atomically with the activation token.
- Never log or send telemetry containing the license key or activation token.
- A signed entitlement is not a secret, but replacing it must be integrity-safe.

## Online and offline behavior

- Validate after activation and around `refreshAfter`, with randomized backoff.
- If the service is unreachable before `validUntil`, continue using the last verified entitlement and show a non-blocking refresh-due state.
- `invalid_activation`, revoked/suspended state, or a successfully received incompatible entitlement is authoritative online denial.
- A network error is not a revocation.
- At `validUntil`, paid features require successful online refresh. Do not silently fall back and destroy customer data; preserve read/export paths where the product supports them.

## Errors

Stable v1 codes are: `invalid_request`, `invalid_license`, `invalid_activation`, `license_suspended`, `license_revoked`, `license_expired`, `entitlement_suspended`, `entitlement_expired`, `activation_limit_reached`, `installation_conflict`, `installation_revoked`, `replayed_request`, `expired_request`, `rate_limited`, `not_found`, and `service_unavailable`.

`rate_limited` may include `Retry-After`. Retry only when `retryable` is true or after explicit user action. Do not repeatedly submit a bad key.

## Compatibility

Applications send protocol version 1 and must reject unknown signed schema versions. They may ignore additive response fields. Driftline keeps `/api/v1` behavior stable; an incompatible change is introduced under a new path/schema with a migration window. The preliminary `/releases/latest` URL is a compatibility alias, not the canonical URL.
