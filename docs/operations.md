# Operations

## Required environment

Public configuration:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DRIFTLINE_API_ONLY` (`true` only on the dedicated licensing API project)

Server-only configuration:

- `SUPABASE_SECRET_KEY`
- `STRIPE_ENVIRONMENT` (`test` for this phase)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DRIFTLINE_ENTITLEMENT_PRIVATE_KEY`
- `DRIFTLINE_ENTITLEMENT_KEY_ID`
- `DRIFTLINE_ENTITLEMENT_ISSUER`
- `DRIFTLINE_LICENSE_KEY_ENCRYPTION_KEY`
- `DRIFTLINE_ADMIN_API_KEY`

Contact email configuration remains optional for the contact workflow. Never copy server-only values into variables beginning with `NEXT_PUBLIC_`.

## Database deployment

Apply migrations in filename order to a non-production Supabase project first. Migration `20260902010000_commerce_entitlements.sql` adds the generic commerce/entitlement model, transactional functions, RLS, and initial MetaTweak configuration. Migration `20260904010000_metatweak_contract_v2.sql` adds truthful generic capability IDs, deprecates ambiguous v1 IDs without dropping history, and resets Free/Pro grants to contract v2.

The same migration stores `refresh_interval_days` as edition configuration. This value schedules validation; it is not a hard expiration for perpetual authorization.

Guard the linked project ref before every remote action. For the current non-production project it must be exactly `kxamksngwlircmycenjb`. Dry-run `npx supabase db push --linked --dry-run`, apply with `npx supabase db push --linked`, then run the rollback test without Docker using `npx supabase db query --linked --file supabase/tests/commerce_entitlements.sql`.

## Dedicated desktop non-production API

Project `dltech-licensing-nonprod` is intentionally separate from the website project. Its production domain is `https://dltech-licensing-nonprod.vercel.app`; Vercel Standard Protection keeps previews protected while the production domain is public. Configure only the non-production Supabase URL/publishable/server keys, Ed25519 private key and key ID, the exact issuer/site URL, and `DRIFTLINE_API_ONLY=true`. Do not copy Stripe, admin-issuance, Vercel-bypass, or production/shared Supabase credentials. The proxy allowlist exposes only health, JWKS, optional Free resolution, activation, validation, and deactivation.

## Key generation

Generate a dedicated Ed25519 key pair and a separate random 32-byte AES key in a trusted operator environment. Store the PKCS8 private key and AES key only in encrypted deployment secrets. Keep a secure backup and record the entitlement `kid`. The public key is derived at runtime and published through JWKS.

## Manual issuance test

After the migration and keys are configured, a trusted operator can issue a zero-dollar test license without Stripe:

```http
POST /api/v1/admin/licenses/issue
Authorization: Bearer <DRIFTLINE_ADMIN_API_KEY>
Content-Type: application/json

{"productId":"metatweak","editionId":"pro","customerEmail":"test@example.com"}
```

The response contains the test license once. Confirm activation on three unique installation UUIDs, rejection on the fourth, deactivation of one, and successful replacement activation.

## Monitoring and recovery

Alert on failed or long-running `webhook_events`, paid orders without entitlements, licenses without active entitlements, and unexpected activation spikes. Retry failed Stripe events from the Stripe dashboard after correcting configuration. The claim function permits a failed event or a processing claim older than five minutes to run again.

Application rollbacks use the previous known-good deployment. Database issues should use a forward corrective migration. Do not reverse destructive schema changes blindly.
