# Driftline.Licensing

`Driftline.Licensing` is the first-party .NET 8 client for Driftline Licensing Protocol v1.
It provides the same local entitlement evaluation, Ed25519 verification, API calls, and
failure policy as `@driftline/licensing-sdk` 1.1.x.

## Development installation

Build a local package from the repository root:

```powershell
dotnet pack packages/Driftline.Licensing/Driftline.Licensing.csproj --configuration Release --output artifacts/nuget
dotnet add package Driftline.Licensing --version 1.0.0 --source <absolute-path-to>\artifacts\nuget
```

Create one `HttpClient`, then create `DriftlineLicensingClient` with the public API base URI,
product ID, and exact signed-entitlement issuer. Cache the activation token, signed entitlement,
and public JWKS returned by activation or validation. Use `EntitlementEvaluator.ResolveLocalAccess`
at startup; it performs no network request and immediately returns the application's local baseline
when paid material is absent or unusable.

Private signing material, Supabase credentials, Stripe configuration, prices, activation limits,
and server feature grants never belong in a desktop application.
