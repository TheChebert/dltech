# Operations

## Environments

Local development uses .env.local. Vercel preview and production values live in project environment settings. The Supabase organization currently has one project; it supports initial staging validation, but separate projects are recommended before real production customer, payment, or license data is accepted.

Required variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY
- NEXT_PUBLIC_SITE_URL for the canonical production origin
- LICENSE_KEY_PEPPER for server-only key hashing and deterministic issuance
- LICENSE_SIGNING_KEY_ID identifying the active public verification key
- LICENSE_SIGNING_PRIVATE_KEY containing base64url PKCS8 Ed25519 private key material

## Branch and release flow

1. Develop on a short-lived branch based on dev.
2. Open a pull request to dev and pass every check.
3. Promote dev to staging through a pull request.
4. Verify the Vercel preview with automated browser tests and a manual content review.
5. Promote staging to main through a pull request.
6. Verify production health, key pages, headers, authentication, and database connectivity.

Protected branches should require Quality and End-to-end checks. Main and staging should require pull requests and prevent force pushes and deletion.

## Database changes

Migrations in supabase/migrations are authoritative and ship with the application change. Apply them to a non-production project first. Favor additive changes. Backfills must be resumable. Destructive changes require a backup, explicit rollback plan, and maintenance window.

## Deployment verification

- Home, services, software, contact, account, sitemap, robots, and social image return successfully.
- GET /api/v1/health reports ok.
- GET /api/v1/products/metatweak/licensing returns protocol v1, Free/Pro policy, and the expected public signing key.
- Malformed activation returns a normalized protocol-v1 error without secret data.
- GET /api/v1/products/metatweak/versions/latest returns a normalized not-found response until a release is published.
- Contact submissions work without exposing records.
- Security headers are present.
- Published products load from Supabase.
- Authentication redirects use the deployed origin.
- Browser checks pass against the deployed URL.

## Rollback

For an application regression, promote the latest known-good Vercel deployment. For a database regression, deploy a forward corrective migration; do not reverse a destructive change blindly. Restore from backup only when data integrity cannot be safely recovered.

## Incident response

1. Disable the affected endpoint, integration, or deployment.
2. Preserve relevant logs without copying secrets.
3. Rotate exposed credentials and invalidate compromised sessions or tokens.
4. Repair and verify in staging.
5. Deploy through the normal gated path.
6. Document impact, root cause, corrective action, and ownership.

## Content and legal operations

Product status, prices, legal text, work examples, and claims require an owner. Keep draft or planned items out of purchase paths until approval is recorded.
