# Licensing test strategy

## Test layers

| Layer | Command | What it proves |
| --- | --- | --- |
| Type/route contract | `npm run typecheck` | Next route signatures and shared TypeScript contract compile |
| Unit/SDK | `npm test` | malformed requests, license keys, Ed25519 verification, tampering, bad keys, offline/grace behavior |
| Coverage | `npm run test:coverage` | regression visibility for application/server libraries |
| Database | `npm run test:db` | migrations plus 46 pgTAP assertions for issuance, activation lifecycle, failures, replay, rate limits, RLS, and webhooks |
| Concurrent database | `npm run test:licensing-concurrency` | four simultaneous activation transactions produce exactly three successes and one limit rejection |
| Lint/build | `npm run lint` and `npm run build` | repository quality and production bundling |
| Browser | `npm run test:e2e` | existing public-site behavior remains intact |

## Safe database environment

Database tests are destructive fixtures and must run against a disposable local Supabase database:

```text
npx supabase start
npx supabase db reset
npm run test:db
npm run test:licensing-concurrency
```

The concurrency script refuses every URL except `localhost` or `127.0.0.1`. Never bypass that guard for staging or production. The pgTAP suite wraps fixtures in a transaction and rolls back.

If Docker/local Supabase is unavailable, unit/type/build checks and `supabase db push --linked --dry-run` can still validate application code and migration ordering, but database and concurrency checks remain required in CI before a production migration.

## Covered scenarios

- valid, invalid, and wrong-product license activation;
- first, repeated, second, third, and max-limit activations;
- simultaneous requests serialized at the database boundary;
- failed max-limit activation removes the unused installation;
- deactivation, reactivation, audited count, and transfer to a freed slot;
- revoked, suspended, and expired license;
- suspended and expired entitlement;
- perpetual license with no expiration;
- malformed request and protocol fields;
- nonce replay and timestamp handling;
- rate-limit bucket exhaustion;
- bad signature, modified payload, wrong verification key, copied installation mismatch, and offline expiry;
- idempotent license issuance and conflicting retry;
- webhook claim, duplicate delivery, changed-payload conflict, and completion;
- duplicate order event returning the original license;
- RLS and service-role-only activation routine.

## Key fixtures

Unit tests generate ephemeral Ed25519 key pairs at runtime; no production private key enters fixtures. Database tests use fixed byte hashes that exist only inside a rolled-back transaction. Never paste real customer keys into tests, issues, or CI logs.

## Migration validation

Before applying a migration:

1. confirm local and remote migration history match;
2. review aggregate row counts and compatibility backfills;
3. run a linked dry run and inspect the exact SQL order;
4. run a fresh local reset and pgTAP suite;
5. verify no migration contains private key material (public keys are expected);
6. back up production and define rollback/forward-fix steps;
7. apply schema before deploying API code that depends on new routines;
8. smoke-test public policy, malformed activation, health, and no-release responses.

## Release gates

Required: lint, typecheck, unit tests, database tests, concurrency test, production build, existing end-to-end suite, migration dry run, secret scan, and human review of RLS/security-definer routines. The tentative MetaTweak price remains inactive until separate commerce approval.
