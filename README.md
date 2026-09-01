# Driftline Tech

Production: https://driftlinetech.com

Production website and supporting platform for Driftline Tech. The application combines the public marketing site, customer account area, support foundation, product catalog, and secure licensing APIs in one deployable Next.js service.

## Stack

- Next.js 16, React 19, TypeScript, and Tailwind CSS
- Supabase Postgres, Auth, Row Level Security, and private Storage
- Vercel hosting and preview deployments
- Vitest unit tests, Playwright browser tests, and GitHub Actions

## Local setup

1. Install dependencies with npm ci.
2. Copy .env.example to .env.local and fill in the Supabase values.
3. Run npm run dev.
4. Open http://localhost:3000.

The server secret is server-only. Never expose it through a NEXT_PUBLIC variable or commit it.

## Quality commands

- npm run lint
- npm run typecheck
- npm test
- npm run test:db
- npm run test:licensing-concurrency
- npm run test:e2e
- npm run build

## Database

Migrations in supabase/migrations are the source of truth. Apply them with the Supabase CLI after linking the correct project. Public pages use approved fallback catalog content if the data service is temporarily unavailable.

## Delivery

Changes move through dev, staging, and main. Pull requests run linting, type checks, unit tests, production compilation, dependency audit, and browser tests. Vercel previews are verified before production promotion.

## Documentation

- docs/architecture.md — architecture and trust boundaries
- docs/platform.md — account, catalog, licensing, and content behavior
- docs/security.md — controls and pre-launch security checklist
- docs/operations.md — release, rollback, and incident procedures
- docs/openapi.yaml — versioned API contract
- docs/licensing/ARCHITECTURE.md — canonical licensing domain and trust boundaries
- docs/licensing/PROTOCOL.md — language-neutral application contract
- docs/licensing/APP-INTEGRATION.md — shared SDK application guide
- docs/licensing/SECURITY.md — licensing threat model and controls
- docs/licensing/TESTING.md — database, concurrency, SDK, and release tests

## Current product status

The marketing experience, account shell, product catalog, contact workflow, admin authorization boundary, reusable licensing protocol/API/SDK, database security policies, and deployment pipeline are implemented. Checkout remains inactive until a provider and commercial terms are approved. Legal pages are operational drafts requiring counsel review before a public commercial launch.
