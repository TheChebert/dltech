using System.Text.Json.Serialization;

namespace Driftline.Licensing;

public sealed record EntitlementAuthorization
{
    [JsonPropertyName("kind")]
    public string Kind { get; init; } = string.Empty;

    [JsonPropertyName("expires_at")]
    public long? ExpiresAt { get; init; }
}

public sealed record VersionEntitlement
{
    [JsonPropertyName("policy")]
    public string Policy { get; init; } = string.Empty;

    [JsonPropertyName("current_version")]
    public string? CurrentVersion { get; init; }
}

public sealed record EntitlementPayload
{
    [JsonPropertyName("schema_version")]
    public int SchemaVersion { get; init; }

    [JsonPropertyName("iss")]
    public string Issuer { get; init; } = string.Empty;

    [JsonPropertyName("aud")]
    public string Audience { get; init; } = string.Empty;

    [JsonPropertyName("sub")]
    public string Subject { get; init; } = string.Empty;

    [JsonPropertyName("jti")]
    public string TokenId { get; init; } = string.Empty;

    [JsonPropertyName("iat")]
    public long IssuedAt { get; init; }

    [JsonPropertyName("refresh_after")]
    public long RefreshAfter { get; init; }

    [JsonPropertyName("exp")]
    public long? ExpiresAt { get; init; }

    [JsonPropertyName("authorization")]
    public EntitlementAuthorization Authorization { get; init; } = new();

    [JsonPropertyName("product_id")]
    public string ProductId { get; init; } = string.Empty;

    [JsonPropertyName("edition_id")]
    public string EditionId { get; init; } = string.Empty;

    [JsonPropertyName("license_type")]
    public string LicenseType { get; init; } = string.Empty;

    [JsonPropertyName("activation_required")]
    public bool ActivationRequired { get; init; }

    [JsonPropertyName("activation_limit")]
    public int ActivationLimit { get; init; }

    [JsonPropertyName("installation_id")]
    public string? InstallationId { get; init; }

    [JsonPropertyName("activation_id")]
    public string? ActivationId { get; init; }

    [JsonPropertyName("features")]
    public IReadOnlyList<string> Features { get; init; } = Array.Empty<string>();

    [JsonPropertyName("version_entitlement")]
    public VersionEntitlement VersionEntitlement { get; init; } = new();
}

public sealed record JsonWebKey
{
    [JsonPropertyName("kty")]
    public string KeyType { get; init; } = string.Empty;

    [JsonPropertyName("crv")]
    public string Curve { get; init; } = string.Empty;

    [JsonPropertyName("x")]
    public string X { get; init; } = string.Empty;

    [JsonPropertyName("kid")]
    public string KeyId { get; init; } = string.Empty;

    [JsonPropertyName("alg")]
    public string Algorithm { get; init; } = string.Empty;

    [JsonPropertyName("use")]
    public string Use { get; init; } = string.Empty;
}

public sealed record JsonWebKeySet
{
    [JsonPropertyName("keys")]
    public IReadOnlyList<JsonWebKey> Keys { get; init; } = Array.Empty<JsonWebKey>();
}

public sealed record EntitlementVerificationOptions(
    string ProductId,
    string Issuer,
    string? InstallationId = null,
    DateTimeOffset? Now = null);

public sealed record EntitlementEvaluation(
    string State,
    bool Authorized,
    EntitlementPayload? Entitlement = null,
    string? Reason = null);

public sealed record LocalAccessResult(
    string State,
    string? Reason = null,
    EntitlementPayload? Entitlement = null,
    bool RefreshDue = false);

public sealed record ValidationDisposition(
    string State,
    bool PreserveAuthorization,
    int? RetryAfterSeconds = null,
    string? Reason = null);

public sealed record ActivationRequest(
    string LicenseKey,
    string InstallationId,
    string Platform,
    string AppVersion,
    string? DeviceName = null);

public sealed record ValidationRequest(
    string ActivationToken,
    string InstallationId,
    string Platform,
    string AppVersion);

public sealed record DeactivationRequest(
    string ActivationToken,
    string InstallationId,
    string Platform,
    string? Reason = null);

public class EntitlementResponse
{
    [JsonPropertyName("entitlementToken")]
    public string EntitlementToken { get; init; } = string.Empty;

    [JsonPropertyName("entitlement")]
    public EntitlementPayload Entitlement { get; init; } = new();

    [JsonPropertyName("verificationKeys")]
    public JsonWebKeySet VerificationKeys { get; init; } = new();
}

public sealed class ActivationResponse : EntitlementResponse
{
    [JsonPropertyName("activationToken")]
    public string ActivationToken { get; init; } = string.Empty;
}

public sealed class ValidationResponse : EntitlementResponse
{
    [JsonPropertyName("valid")]
    public bool Valid { get; init; }

    [JsonPropertyName("validatedAt")]
    public DateTimeOffset ValidatedAt { get; init; }
}

public sealed record DeactivationResponse
{
    [JsonPropertyName("deactivated")]
    public bool Deactivated { get; init; }

    [JsonPropertyName("deactivatedAt")]
    public DateTimeOffset DeactivatedAt { get; init; }
}
