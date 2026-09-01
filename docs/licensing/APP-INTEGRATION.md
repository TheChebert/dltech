# Integrating a Driftline application

This guide uses the TypeScript reference package in `packages/licensing-sdk`. Other languages must implement [PROTOCOL.md](./PROTOCOL.md) and pass the same signature/contract fixtures rather than querying Supabase.

## Register the product

Add a deterministic migration that creates:

1. one stable product slug and compact product code;
2. stable feature keys;
3. supported platform keys;
4. editions and edition-feature joins;
5. pricing records (inactive until approved);
6. releases/assets only when publishable.

Never key logic by a display name. Do not copy MetaTweak IDs or add product-specific branches to licensing functions.

## Bundle safe defaults

Compile the product slug, protocol version 1, expected issuer, and the product's free-edition defaults into the app. This lets an activation-free edition start offline. Fetch `/api/v1/products/{slug}/licensing` when online and compare it to supported protocol/schema versions.

Do not bundle the Supabase URL/key, service role, license pepper, private signing key, webhook secret, or an administrative API credential.

## Install the reference SDK

Until the private package is published, consume `packages/licensing-sdk` as a workspace or repository package. Its package name is `@driftline/licensing`.

```ts
import {
  LicensingClient,
  createInstallationId,
  type LicenseStore,
  type StoredLicense,
} from "@driftline/licensing";
```

Implement `LicenseStore` with the target operating system's protected credential storage. The example below describes the interface only; a plain file is not an acceptable production token store.

```ts
class PlatformCredentialStore implements LicenseStore {
  async load(productSlug: string): Promise<StoredLicense | null> {
    // Read and deserialize one atomic record from OS-protected storage.
    throw new Error("Implement for the target platform");
  }

  async save(license: StoredLicense): Promise<void> {
    // Atomically replace token, signed entitlement, key ID, and public key.
    throw new Error("Implement for the target platform");
  }

  async remove(productSlug: string): Promise<void> {
    // Delete the protected activation record.
    throw new Error("Implement for the target platform");
  }
}
```

Persist one random installation UUID independently so removing a license does not create a new installation identity. Generate it once with `createInstallationId()`.

## Create the client

```ts
const licensing = new LicensingClient({
  baseUrl: "https://driftlinetech.com/api/v1",
  productSlug: "your-stable-product-slug",
  installationId: await loadOrCreateInstallationId(),
  platform: "windows-x64",
  appVersion: "1.0.0",
  store: new PlatformCredentialStore(),
});
```

## Startup behavior

1. Load the protected activation record.
2. If none exists, enable the bundled default free edition. Do not contact activation for a no-activation edition.
3. If an activation exists, call `loadOffline()` before enabling paid features. This verifies signature, product, installation, issuer, versions, and time bounds.
4. If state is `valid`, continue normally.
5. If state is `refresh_due`, continue within grace and schedule `refresh()` with randomized exponential backoff.
6. If offline verification is expired, request an online refresh. Preserve access to customer data/export even if paid editing features must pause.

## Activation

```ts
try {
  const entitlement = await licensing.activate(userEnteredKey, friendlyDeviceName);
  enableFeatures(entitlement.features);
} catch (error) {
  // Present a message based on LicensingError.code; never log the entered key.
}
```

Trim and uppercase human-entered keys only for display/usability. The SDK/server performs canonical normalization. Disable repeated automatic retries for invalid keys and respect `retryable`/`Retry-After` behavior.

## Validation and refresh

Use `validate()` for an explicit online status check. Use `refresh()` at the signed `refreshAfter` time. Refresh rotates the activation token; the SDK verifies the response before atomically saving the new state. Do not separately persist fields in a way that could leave an old token paired with a new entitlement.

## Deactivation and transfer

```ts
await licensing.deactivate("user_requested_transfer");
```

Only report deactivation complete after server success and local credential deletion. A new device then activates normally with the license key. If the old installation is lost, route the customer through an authenticated support ownership check.

## Feature and version checks

- Treat feature keys as an allowlist. Unknown keys can be ignored; missing required keys disable only those capabilities.
- `all_versions` permits every supported application major version.
- `major` requires the running semantic version's major component to equal `majorVersion`.
- Never infer an entitlement from price, product display copy, or the presence of a local file.

## Required application tests

- bundled free edition works on first launch with no network;
- paid token verifies offline and unlocks only listed features;
- copied token fails on another installation ID;
- tampered/bad-signature/unknown-key tokens fail closed;
- refresh-due remains usable until grace ends;
- expired grant preserves data access while restricting paid operations as designed;
- activation/deactivation/transfer and token rotation survive process crashes atomically;
- every server error code maps to useful, non-secret UI copy.

See [TESTING.md](./TESTING.md) for platform fixtures and commands.
