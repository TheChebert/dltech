# Security model

## Trust boundaries

- Public browsers are untrusted and hold only publishable configuration.
- Authenticated browsers cannot authorize themselves; server guards and Row Level Security decide access.
- The Supabase server secret is available only to server route handlers and deployment secrets.
- License clients are untrusted. Keys, installation ids, nonces, timestamps, and tokens are validated.
- Payment events are untrusted until their provider signatures are verified.

## Implemented controls

- Row Level Security on every application table
- Least-privilege anonymous and authenticated grants
- Server-side admin authorization from database roles
- Private release storage
- SHA-256 hashing for license keys and device identifiers
- Single-use hashed nonces and timestamp freshness checks
- Database-backed rate limits
- Honeypot and rate limits on contact submissions
- Idempotency storage for future webhook events
- Structured API errors without stack traces
- Content Security Policy, HSTS, frame blocking, MIME sniff protection, restrictive permissions, and strict referrer policy
- Dependency audit and automated release gates

## Secret handling

The local environment file is ignored by Git. Vercel and GitHub receive credentials through encrypted environment stores. Never place the server secret in browser code, screenshots, tickets, documentation, or logs. Rotate any credential that may have been disclosed.

## Operational controls

- Create separate Supabase projects for development, staging, and production before accepting real customer or payment data.
- Restrict production secret access to the minimum operators.
- Enable platform audit visibility and alerts.
- Back up the production database and test restoration.
- Review rate-limit thresholds using real traffic.
- Add durable delivery and alerting for contact messages and webhook retries.
- Run dependency updates through pull requests and tests.

## Pre-launch security checklist

- Obtain legal approval for privacy, terms, and license documents.
- Add the approved dark logo and final icon assets.
- Configure a verified sending domain and transactional email provider.
- Select the payment provider and complete signed, idempotent webhook tests.
- Test authorization with customer, support, and admin accounts.
- Run a dependency audit, secret scan, and external security assessment.
- Verify backups, rollback, incident ownership, and escalation.
- Confirm all public claims, pricing, and examples have approval.
