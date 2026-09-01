# Architecture

## System overview

Visitor or customer
  -> Vercel edge and Next.js application
      -> public server-rendered pages
      -> Supabase Auth for identity
      -> Supabase Postgres through Row Level Security
      -> private Supabase Storage for future release binaries
      -> versioned licensing APIs
  -> GitHub Actions validates branch promotion

The browser receives only the Supabase project URL and publishable key. Privileged writes and licensing operations run on the server with the server-only secret.

## Runtime boundaries

### Public presentation

Marketing pages are responsive, accessible, indexable, and server rendered. Product content is read from the public Supabase catalog with controlled local fallback so a temporary catalog outage does not break the public experience.

### Identity and authorization

Supabase Auth owns identity. A profile record stores the customer, support, or admin role. Server route guards read the database role; email allowlists and client-only checks never grant privileges. Session middleware protects account and admin routes.

### Data access

Every application table has Row Level Security enabled. Visitors can read only explicitly published catalog and support content. Customers can access only their own records. Support and admin capabilities are granted through database helper functions and server checks.

### Licensing

Applications call the canonical versioned API to discover policy and activate, validate, refresh, or deactivate an installation. License keys are HMAC-hashed with a server-only pepper; installation identifiers, activation tokens, and nonces are stored as one-way hashes. Ed25519-signed entitlements permit bounded offline use. Postgres row locks enforce activation limits under concurrency. See [the licensing architecture](./licensing/ARCHITECTURE.md).

### Release distribution

Release metadata is public only when a version is published. Binaries belong in the private product-releases bucket. A future download endpoint must validate entitlement and issue a short-lived signed URL.

### Commerce

Orders, order items, webhook events, entitlements, and licenses are modeled, but checkout remains inactive until a payment provider is selected. Generic webhook claiming and license issuance are idempotent; provider adapters must still verify signatures over the raw body before claiming an event.

## Repository layout

- src/app — pages, route handlers, metadata, and APIs
- src/components — shared presentation and forms
- src/lib — content, authorization, Supabase clients, and API security
- packages/licensing-sdk — Driftline application protocol reference client
- supabase/migrations — schema, policies, functions, and seed data
- tests/e2e — browser journeys
- docs — architecture, platform, licensing protocol, security, operations, and API contract
- .github — continuous integration and dependency updates

## Failure strategy

Public pages degrade to approved fallback catalog content. Sensitive operations fail closed when the database or server credential is unavailable. API responses omit stack traces, secrets, and raw sensitive identifiers.
