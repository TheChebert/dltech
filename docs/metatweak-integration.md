# MetaTweak native licensing handoff

## Supported integration contract

| Resource | Supported version |
| --- | --- |
| Product ID | `metatweak` |
| Edition IDs | `free`, `pro` |
| Licensing API | `v1` |
| Protocol specification | `1.1.0` |
| Product contract | `contracts/products/metatweak.v2.json` (`metatweak.v2`) |
| Native SDK | `Driftline.Licensing` `1.0.0` (`net8.0`) |
| TypeScript reference | `@driftline/licensing-sdk` `1.1.0` |
| Integration bundle | `metatweak-integration` `2.0.0` |

Contract v1 remains archived for history. New MetaTweak work uses contract v2. API route names and signed-token schema remain v1; specification 1.1.0 adds mandatory issuer verification to the supported integrations and shared cross-runtime vectors without changing server wire shapes.

## Non-production origin

The dedicated desktop-client origin is:

```text
https://dltech-licensing-nonprod.vercel.app
```

This is a separate Vercel project configured as an API-only production deployment backed exclusively by Driftline Licensing Nonprod Supabase. Its production domain is public under Vercel Standard Protection; preview/deployment URLs remain protected. `DRIFTLINE_API_ONLY=true` returns 404 for the website, admin issuance, Checkout, Stripe webhook, and every unrelated route. Only health, public JWKS, optional Free resolution, activation, validation, and deactivation are reachable. A desktop app never receives or embeds a Vercel bypass, Supabase credential, admin key, Stripe key, or signing private key.

The signed-entitlement issuer must equal the exact origin above. Do not substitute a protected Preview URL or generated deployment URL.

## Development package installation

From the Driftline platform repository, build the local NuGet feed:

```powershell
dotnet pack packages/Driftline.Licensing/Driftline.Licensing.csproj --configuration Release --output artifacts/nuget
```

From MetaTweak, after the platform owner supplies that versioned artifact:

```powershell
dotnet add package Driftline.Licensing --version 1.0.0 --source <absolute-path-to>\artifacts\nuget
```

Long term, publish the same package ID and version to the approved Driftline NuGet feed. MetaTweak must consume a package or coordinated project reference; it must not copy the SDK source.

## Exact edition boundary

Free is compiled into MetaTweak and works on a first-ever launch with no internet, token, account, key, activation, JWKS, or licensing API call. The optional `/api/v1/entitlements/resolve` endpoint is diagnostics/synchronization only and must not gate startup or Free capability.

Free includes:

- opening and inspection for every currently supported file type;
- preview, inspection, search, themes, accessibility, and normal usability;
- single-file operations;
- basic Office document metadata editing for Title, Subject, Author, Keywords, Comments, Category, and Company;
- mandatory safe backups where editing requires them, plus normal history and undo safety.

Pro capabilities are additive and must be checked with the feature ID, never an edition-name comparison:

| Feature ID | Pro boundary |
| --- | --- |
| `advanced_metadata` | Last Saved By, Manager, Revision Number, Total Editing Time, PDF Creator, and embedded version-label removal. |
| `extended_file_type_editing` | Embedded metadata editing for PDF and JPEG/JPG/TIFF/TIF, plus future explicitly supported non-Office embedded formats. Opening and inspection remain Free. |
| `datetime_editing` | Filesystem timestamps, supported embedded dates/times, and copy-date utilities. |
| `advanced_backup_controls` | Configurable backup behavior, safe disable-backup options, and backup-management options. Mandatory safety backups remain Free. |
| `backup_auto_cleanup` | Automatic backup cleanup and retention management. |
| `batch_editing` | Multi-file editing workflows. |
| `presets` | Saving and reusing editing presets/templates. |
| `explorer_integration` | Windows Explorer context-menu and Open With workflows. |

`document_metadata` describes the basic Free metadata boundary and may appear in optional resolver or full Pro output. It never authorizes the local baseline.

The following v1 IDs are deprecated and are no longer granted:

- `all_file_types`: replaced by `extended_file_type_editing`; file opening and inspection are not gated.
- `file_attributes`: MetaTweak does not ship file-attribute editing, so the contract does not pretend it does.
- `backup_controls`: replaced by `advanced_backup_controls`; basic safety backups are Free.
- `advanced_operations`: copy date maps to `datetime_editing`, version-label removal maps to `advanced_metadata`, and history/undo remain Free. No micro-entitlements were added.

## Explorer lifecycle

- Free installation: do not register or expose Pro shell commands.
- Activated Pro: register per-user Explorer/Open With entries after a valid `explorer_integration` entitlement is locally available, or enable preinstalled infrastructure only then.
- Deactivated/denied Pro or fallback to Free: remove or disable paid shell entries and return to Free without misleading non-functional commands.
- Portable installation: do not register shell integration.

## Client state and security

Generate one random UUID per installed app instance. Persist it as the installation ID; do not use hardware, user, network, or device fingerprints. Store the opaque activation token using Windows user-scoped protected storage. Store the signed entitlement, public JWKS, last successful validation time, and retry schedule in application data with integrity-conscious, atomic writes. Public JWKS is not secret. Never store the license key after successful activation unless the user explicitly chooses a separate secure recovery workflow.

The client package contains no Supabase or Stripe access and no signing private material. MetaTweak must not add database queries, provider IDs, prices, activation counts, refresh intervals, edition grant maps, or a second token/state implementation.

## Canonical lifecycle

1. Startup calls `EntitlementEvaluator.ResolveLocalAccess` with cached paid material. No paid token returns Free immediately and performs no network operation.
2. Activation calls `DriftlineLicensingClient.ActivateAsync` once with product `metatweak`, the entered key, installation UUID, platform, app version, and optional device name. Atomically cache the returned activation token, signed entitlement, and public keys.
3. Local verification checks Ed25519 signature, token structure, exact issuer, product/audience, installation binding, timing, and feature IDs through the SDK.
4. `valid_perpetual` enables paid features. `refresh_due` also enables them and schedules opportunistic validation.
5. Validation success atomically replaces cached signed material and resets retry state.
6. Timeout, DNS/network failure, HTTP 408/429/5xx, or a prolonged service outage preserves an already valid perpetual authorization as `stale_but_authorized`. Honor `Retry-After`; otherwise retry after 1 hour, 6 hours, then at most daily.
7. Definitive server contact reporting revoked, suspended, refunded, invalid/deactivated activation, or another authoritative 401/403 denial removes paid capabilities and returns to Free. Time-limited trial/subscription certificates still hard-expire locally.
8. Successful online deactivation clears activation token, entitlement, public-key cache associated with paid state, validation metadata, and paid shell integration. A failed offline deactivation does not claim success.

## Integration verification

MetaTweak must test first-ever offline Free, zero Free resolver calls, activation, signed-token cache, exact issuer, wrong issuer, wrong installation, valid perpetual, refresh due, prolonged outage, 429/5xx, hard-expired trial/subscription, tampering, feature gates, three active installations, fourth rejection, deactivation/replacement, revocation, suspension, refund/invalid activation, and Explorer registration lifecycle. Use disposable non-production licenses only.

The platform parity fixture is `contracts/licensing/protocol-v1.test-vectors.json`. It contains test tokens and public keys but no private signing key. MetaTweak should test its SDK integration, not recreate the fixture evaluator.

## Reproducible handoff bundle

Run `npm run contracts:bundle`. The builder verifies SDK versions against `contracts/integration-bundles/metatweak.json`, copies the complete canonical platform guide, protocol, this handoff, contracts v1/v2, and NuGet instructions into `artifacts/metatweak-integration/2.0.0`, and writes SHA-256 hashes. Transfer that versioned directory or publish it as a CI artifact. Do not manually copy individual files.

## Exact MetaTweak Codex prompt

```text
Read every file in the supplied `metatweak-integration` 2.0.0 bundle before changing MetaTweak. Use product contract `metatweak.v2`, Driftline Licensing API v1 / protocol specification 1.1.0, and the first-party NuGet package `Driftline.Licensing` version 1.0.0. Use the non-production API base URI and entitlement issuer `https://dltech-licensing-nonprod.vercel.app`. Do not use `@driftline/licensing-sdk`, direct HTTP as an alternate license implementation, Supabase, Stripe, database queries, a custom key/token format, private keys, provider IDs, pricing, activation-count rules, refresh timing rules, edition-name gates, or a locally copied licensing state machine.

Generate and persist one random installation UUID per installed MetaTweak instance. Treat Free as a built-in local baseline that starts immediately on a first-ever offline launch with no token, account, license key, activation, JWKS, or API call. Do not call `/api/v1/entitlements/resolve` during startup and never require its `document_metadata` result. Free includes all opening/inspection, preview/search/themes/accessibility, single-file operation, basic Office metadata fields Title/Subject/Author/Keywords/Comments/Category/Company, mandatory safe backups, and normal history/undo.

Reference `Driftline.Licensing` 1.0.0. Create one reusable `HttpClient` and `DriftlineLicensingClient`. For activation call `ActivateAsync`; securely and atomically persist the returned opaque activation token, signed entitlement, and public JWKS. At startup call `EntitlementEvaluator.ResolveLocalAccess` with the cached token/keys and exact issuer. Use `EntitlementEvaluator.HasFeature` for every paid capability. Do not fetch JWKS on every launch.

Map Pro exactly: `advanced_metadata` gates Last Saved By, Manager, Revision Number, Total Editing Time, PDF Creator, and version-label removal; `extended_file_type_editing` gates embedded PDF and JPEG/JPG/TIFF/TIF editing but never opening/inspection; `datetime_editing` gates filesystem/embedded date-time edits and copy-date; `advanced_backup_controls` gates configurable/disable/manage behavior while mandatory backups remain Free; `backup_auto_cleanup` gates automatic cleanup; `batch_editing` gates multi-file workflows; `presets` gates saved presets/templates; `explorer_integration` gates Explorer/Open With workflows. Do not consume deprecated `all_file_types`, `file_attributes`, `backup_controls`, or `advanced_operations`.

Keep valid perpetual Pro enabled for both `valid_perpetual` and `refresh_due`. Validate opportunistically. Use `ValidationPolicy.Classify` for failures: timeout, DNS/network, 408, 429, and 5xx preserve Pro as `stale_but_authorized` and honor bounded retry; a prolonged outage must not disable a legitimate perpetual license. Remove Pro only after an authoritative revoked, suspended, refunded, invalid activation, or other definitive denial. Preserve hard local expiry for time-limited licenses. Successful validation replaces the cache atomically. Successful online deactivation clears paid state and removes/disables Explorer integration; failed offline deactivation does not claim success.

Register Explorer integration per user only while `explorer_integration` is entitled; Free and portable installs must not expose paid shell entries. On deactivation or authoritative fallback, remove or disable those entries. Store the activation token with Windows user-scoped protected storage; store signed entitlement, public keys, validation time, and retry metadata in application data. Do not retain the entered license key after successful activation.

Add MetaTweak integration tests for first-ever offline Free/no resolver, activation serialization and cache, exact/wrong issuer, installation binding, valid/refresh-due perpetual, cached-key offline verification, prolonged outage, 429/5xx, time-limited expiry, tampering, every feature boundary, activation limit response, deactivation/replacement, authoritative revocation/suspension/refund/invalid activation, cancellation, and Explorer registration/removal. Use disposable Driftline non-production licenses. Do not change the canonical protocol or copy SDK policy code into MetaTweak.
```

The contract and bundle contain no authoritative price, activation allowance, Stripe Product/Price, license issuance, refresh interval, or commercial grant configuration. Those values remain centrally configurable and can change without a MetaTweak build.
