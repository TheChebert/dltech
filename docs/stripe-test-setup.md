# First Stripe Test Mode licensing lifecycle

No Stripe Product or Price ID is invented or committed by this repository. Perform this checklist in order against a non-production Supabase project and a non-production website deployment.

## 1. Provision and migrate Supabase

1. Create the non-production Supabase project and record its project URL, publishable key, and server secret key.
2. Link this repository's Supabase CLI to that project and apply every migration in filename order. Do not skip `20260901010000_atomic_license_activation.sql` or `20260902010000_commerce_entitlements.sql`.
3. Run `supabase/tests/commerce_entitlements.sql` against the migrated database; it must complete and roll back without an assertion error.
4. Confirm the seeded `metatweak` product has active `free` and `pro` editions. Confirm Pro is `perpetual`, activation is required, and `refresh_interval_days` is 30. These are central values and may be changed later without a MetaTweak build.

## 2. Generate and store licensing secrets

1. In a trusted operator environment, generate a dedicated Ed25519 key pair. Export the private key as base64 PKCS8 for `DRIFTLINE_ENTITLEMENT_PRIVATE_KEY`; keep the private key and backup outside the repository.
2. Choose and record a unique signing key ID for `DRIFTLINE_ENTITLEMENT_KEY_ID`.
3. Generate a separate random 32-byte key, base64 encode it, and store it as `DRIFTLINE_LICENSE_KEY_ENCRYPTION_KEY`.
4. Generate a separate long random bearer secret for `DRIFTLINE_ADMIN_API_KEY`.
5. Set `DRIFTLINE_ENTITLEMENT_ISSUER` and `NEXT_PUBLIC_SITE_URL` to the exact HTTPS origin of the non-production website.

## 3. Create Stripe Test Mode configuration

1. In Stripe Test Mode, create a Product named `MetaTweak Pro`.
2. Add one non-recurring Price: USD 14.99, one-time.
3. Copy the Test Mode Product ID (`prod_...`) and Price ID (`price_...`).
4. Apply them to the seeded platform price row:

```sql
update public.product_prices
set provider_product_id = '<TEST_PRODUCT_ID>',
    provider_price_id = '<TEST_PRICE_ID>',
    metadata = metadata - 'configuration_status'
where edition_id = '44444444-0000-4000-8000-000000000002'
  and provider = 'stripe'
  and environment = 'test'
  and currency = 'USD'
  and amount_minor = 1499
  and billing_interval = 'one_time';
```

5. Verify exactly one active default Stripe Test price row matches the Product ID, Price ID, USD currency, amount, and one-time interval.

## 4. Configure and deploy the website

Set these public values:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Set these server-only values:

- `SUPABASE_SECRET_KEY`
- `STRIPE_ENVIRONMENT=test`
- `STRIPE_SECRET_KEY` using an `sk_test_...` key
- `DRIFTLINE_ENTITLEMENT_PRIVATE_KEY`
- `DRIFTLINE_ENTITLEMENT_KEY_ID`
- `DRIFTLINE_ENTITLEMENT_ISSUER`
- `DRIFTLINE_LICENSE_KEY_ENCRYPTION_KEY`
- `DRIFTLINE_ADMIN_API_KEY`

Deploy once so the HTTPS webhook URL exists. In Stripe Test Mode, create `https://<non-production-host>/api/v1/webhooks/stripe`, subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`, then store that endpoint's `whsec_...` as `STRIPE_WEBHOOK_SECRET`. Redeploy after adding the webhook secret.

Never put a server-only value in a `NEXT_PUBLIC_` variable or in MetaTweak.

## 5. Smoke-test the deployed services

1. `GET /api/v1/health` must return healthy database status.
2. `GET /api/v1/licensing/jwks` must return the configured `kid` and a public Ed25519 key only.
3. Open `/software/metatweak`; the central Pro price and purchase action must render.
4. On a clean MetaTweak installation with networking blocked and no local licensing state, launch once. Free must work immediately and no call to `/api/v1/entitlements/resolve` may occur.

## 6. Complete purchase and issuance

1. Start Pro checkout from `/software/metatweak` and complete payment with a Stripe Test Mode card.
2. Wait for the verified webhook, not the success redirect, to fulfill the order.
3. Retrieve the license through the success flow's order ID and private access token.
4. Confirm one paid order, one succeeded payment, one active entitlement, one active perpetual license, and one processed webhook event refer to that purchase.
5. Resend the same Stripe event. Those counts must remain unchanged and the endpoint must return success.

## 7. Complete activation and offline validation

1. In MetaTweak, activate Pro with the issued key and a newly generated persisted installation UUID.
2. Confirm the response contains an opaque activation token, signed entitlement, and `verificationKeys`; cache all three.
3. Decode the signed payload for inspection only: it must say `authorization.kind = perpetual`, `authorization.expires_at = null`, contain `refresh_after`, omit `exp`, bind the installation UUID, and contain the platform-issued paid feature IDs.
4. Relaunch offline. Cached signature verification must enable Pro without calling JWKS or validation.
5. Restore networking and validate. Confirm a newly signed entitlement and keys are stored and the refresh window advances.
6. Simulate timeout, DNS failure, 429, and 5xx responses in a controlled client/test environment. Each must preserve Pro as `stale_but_authorized` and schedule retry.

## 8. Complete activation-slot and revocation lifecycle

1. Activate the same test license on three unique installation UUIDs; all must succeed.
2. Attempt a fourth unique installation; it must return `activation_limit_reached` without creating an active slot.
3. Deactivate one of the first three while online, clear that installation's cached paid state, and activate the fourth; it must now succeed.
4. Validate with the deactivated token; the server must return `invalid_activation`, and the client must remove Pro for that installation.
5. For the disposable test license, set the license to `suspended` and validate a still-active installation. Confirm the definitive `license_suspended` response removes Pro. Restore `active`, validate/reactivate as appropriate, then set `revoked` and confirm `license_revoked` removes Pro on the next successful server contact.
6. Confirm that an offline installation retains its previously valid perpetual authorization until it reconnects and receives that definitive denial.

The environment is ready for wider non-production testing only after every step above passes. Before any live rollout, create separate live Product/Price mappings and webhook secrets, set `STRIPE_ENVIRONMENT=live`, use only live server secrets, and repeat the full lifecycle in a production-like environment.
