using System.Text;
using System.Text.Json;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;

namespace Driftline.Licensing;

public sealed class EntitlementVerificationException(string code) : Exception(code)
{
    public string Code { get; } = code;
}

public static class EntitlementEvaluator
{
    private const string TokenType = "DLT-ENTITLEMENT+jwt";

    public static EntitlementEvaluation Evaluate(
        string token,
        JsonWebKeySet verificationKeys,
        EntitlementVerificationOptions options)
    {
        try
        {
            var (payload, now) = VerifySignedPayload(token, verificationKeys, options);
            if (payload.Authorization.Kind == "time_limited" && payload.Authorization.ExpiresAt <= now)
            {
                return new("expired_time_limited", false, payload);
            }

            if (payload.RefreshAfter <= now)
            {
                return new("refresh_due", true, payload);
            }

            return new(
                payload.Authorization.Kind == "perpetual" ? "valid_perpetual" : "valid_time_limited",
                true,
                payload);
        }
        catch (EntitlementVerificationException exception)
        {
            return new("invalid", false, Reason: exception.Code);
        }
        catch (Exception)
        {
            return new("invalid", false, Reason: "invalid_entitlement");
        }
    }

    public static EntitlementPayload VerifyAuthorized(
        string token,
        JsonWebKeySet verificationKeys,
        EntitlementVerificationOptions options)
    {
        var evaluation = Evaluate(token, verificationKeys, options);
        if (evaluation.State == "invalid")
        {
            throw new EntitlementVerificationException(evaluation.Reason ?? "invalid_entitlement");
        }

        if (evaluation.State == "expired_time_limited")
        {
            throw new EntitlementVerificationException("entitlement_expired");
        }

        return evaluation.Entitlement!;
    }

    public static LocalAccessResult ResolveLocalAccess(
        string? entitlementToken,
        JsonWebKeySet? verificationKeys,
        EntitlementVerificationOptions options)
    {
        if (string.IsNullOrWhiteSpace(entitlementToken))
        {
            return new("baseline", "no_paid_entitlement");
        }

        if (verificationKeys is null)
        {
            return new("baseline", "verification_keys_missing");
        }

        var evaluation = Evaluate(entitlementToken, verificationKeys, options);
        if (evaluation.Authorized)
        {
            return new("entitled", Entitlement: evaluation.Entitlement, RefreshDue: evaluation.State == "refresh_due");
        }

        return evaluation.State == "expired_time_limited"
            ? new("baseline", "expired_time_limited")
            : new("baseline", "invalid_entitlement");
    }

    public static bool HasFeature(EntitlementPayload entitlement, string featureId) =>
        entitlement.Features.Contains(featureId, StringComparer.Ordinal);

    private static (EntitlementPayload Payload, long Now) VerifySignedPayload(
        string token,
        JsonWebKeySet verificationKeys,
        EntitlementVerificationOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.ProductId) || string.IsNullOrWhiteSpace(options.Issuer))
        {
            throw new EntitlementVerificationException("entitlement_verification_options_invalid");
        }

        var parts = token.Split('.');
        if (parts.Length != 3 || parts.Any(string.IsNullOrWhiteSpace))
        {
            throw new EntitlementVerificationException("invalid_entitlement_token");
        }

        TokenHeader? header;
        try
        {
            header = JsonSerializer.Deserialize<TokenHeader>(DecodeBase64Url(parts[0]), JsonDefaults.Options);
        }
        catch (Exception)
        {
            throw new EntitlementVerificationException("invalid_entitlement_token");
        }

        if (header is null || header.Algorithm != "EdDSA" || header.Type != TokenType || header.Version != 1)
        {
            throw new EntitlementVerificationException("unsupported_entitlement_token");
        }

        var key = verificationKeys.Keys.FirstOrDefault(candidate =>
            candidate.KeyId == header.KeyId &&
            candidate.Algorithm == "EdDSA" &&
            candidate.Use == "sig" &&
            candidate.KeyType == "OKP" &&
            candidate.Curve == "Ed25519" &&
            !string.IsNullOrWhiteSpace(candidate.X));
        if (key is null)
        {
            throw new EntitlementVerificationException("entitlement_key_not_found");
        }

        byte[] signature;
        byte[] publicKey;
        try
        {
            signature = DecodeBase64Url(parts[2]);
            publicKey = DecodeBase64Url(key.X);
        }
        catch (FormatException)
        {
            throw new EntitlementVerificationException("invalid_entitlement_signature");
        }

        var message = Encoding.ASCII.GetBytes($"{parts[0]}.{parts[1]}");
        var verifier = new Ed25519Signer();
        verifier.Init(false, new Ed25519PublicKeyParameters(publicKey, 0));
        verifier.BlockUpdate(message, 0, message.Length);
        if (!verifier.VerifySignature(signature))
        {
            throw new EntitlementVerificationException("invalid_entitlement_signature");
        }

        LegacyEntitlementPayload? raw;
        try
        {
            raw = JsonSerializer.Deserialize<LegacyEntitlementPayload>(DecodeBase64Url(parts[1]), JsonDefaults.Options);
        }
        catch (Exception)
        {
            throw new EntitlementVerificationException("invalid_entitlement_token");
        }

        if (raw is null)
        {
            throw new EntitlementVerificationException("invalid_entitlement_token");
        }

        var payload = Normalize(raw);
        var now = (options.Now ?? DateTimeOffset.UtcNow).ToUnixTimeSeconds();
        if (payload.Issuer != options.Issuer)
        {
            throw new EntitlementVerificationException("entitlement_issuer_mismatch");
        }

        if (payload.SchemaVersion != 1 || payload.ProductId != options.ProductId || payload.Audience != options.ProductId)
        {
            throw new EntitlementVerificationException("entitlement_product_mismatch");
        }

        if (payload.IssuedAt > now + 300)
        {
            throw new EntitlementVerificationException("entitlement_not_yet_valid");
        }

        if (payload.ActivationRequired &&
            (string.IsNullOrWhiteSpace(options.InstallationId) || payload.InstallationId != options.InstallationId))
        {
            throw new EntitlementVerificationException("entitlement_installation_mismatch");
        }

        return (payload, now);
    }

    private static EntitlementPayload Normalize(LegacyEntitlementPayload raw)
    {
        var authorization = raw.Authorization;
        if (authorization is null)
        {
            if (raw.LicenseType == "perpetual")
            {
                authorization = new() { Kind = "perpetual", ExpiresAt = null };
            }
            else if (raw.ExpiresAt.HasValue)
            {
                authorization = new() { Kind = "time_limited", ExpiresAt = raw.ExpiresAt };
            }
            else
            {
                throw new EntitlementVerificationException("entitlement_authorization_invalid");
            }
        }

        if (authorization.Kind is not ("perpetual" or "time_limited") ||
            (authorization.Kind == "perpetual" && authorization.ExpiresAt is not null) ||
            (authorization.Kind == "time_limited" && authorization.ExpiresAt is null))
        {
            throw new EntitlementVerificationException("entitlement_authorization_invalid");
        }

        return new()
        {
            SchemaVersion = raw.SchemaVersion,
            Issuer = raw.Issuer,
            Audience = raw.Audience,
            Subject = raw.Subject,
            TokenId = raw.TokenId,
            IssuedAt = raw.IssuedAt,
            RefreshAfter = raw.RefreshAfter ?? raw.ExpiresAt ?? raw.IssuedAt,
            ExpiresAt = raw.ExpiresAt,
            Authorization = authorization,
            ProductId = raw.ProductId,
            EditionId = raw.EditionId,
            LicenseType = raw.LicenseType,
            ActivationRequired = raw.ActivationRequired,
            ActivationLimit = raw.ActivationLimit,
            InstallationId = raw.InstallationId,
            ActivationId = raw.ActivationId,
            Features = raw.Features ?? Array.Empty<string>(),
            VersionEntitlement = raw.VersionEntitlement ?? new(),
        };
    }

    private static byte[] DecodeBase64Url(string value)
    {
        var normalized = value.Replace('-', '+').Replace('_', '/');
        normalized += new string('=', (4 - normalized.Length % 4) % 4);
        return Convert.FromBase64String(normalized);
    }

    private sealed record TokenHeader
    {
        [System.Text.Json.Serialization.JsonPropertyName("alg")]
        public string Algorithm { get; init; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("kid")]
        public string KeyId { get; init; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("typ")]
        public string Type { get; init; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("v")]
        public int Version { get; init; }
    }

    private sealed record LegacyEntitlementPayload
    {
        [System.Text.Json.Serialization.JsonPropertyName("schema_version")]
        public int SchemaVersion { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("iss")]
        public string Issuer { get; init; } = string.Empty;
        [System.Text.Json.Serialization.JsonPropertyName("aud")]
        public string Audience { get; init; } = string.Empty;
        [System.Text.Json.Serialization.JsonPropertyName("sub")]
        public string Subject { get; init; } = string.Empty;
        [System.Text.Json.Serialization.JsonPropertyName("jti")]
        public string TokenId { get; init; } = string.Empty;
        [System.Text.Json.Serialization.JsonPropertyName("iat")]
        public long IssuedAt { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("refresh_after")]
        public long? RefreshAfter { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("exp")]
        public long? ExpiresAt { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("authorization")]
        public EntitlementAuthorization? Authorization { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("product_id")]
        public string ProductId { get; init; } = string.Empty;
        [System.Text.Json.Serialization.JsonPropertyName("edition_id")]
        public string EditionId { get; init; } = string.Empty;
        [System.Text.Json.Serialization.JsonPropertyName("license_type")]
        public string LicenseType { get; init; } = string.Empty;
        [System.Text.Json.Serialization.JsonPropertyName("activation_required")]
        public bool ActivationRequired { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("activation_limit")]
        public int ActivationLimit { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("installation_id")]
        public string? InstallationId { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("activation_id")]
        public string? ActivationId { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("features")]
        public IReadOnlyList<string>? Features { get; init; }
        [System.Text.Json.Serialization.JsonPropertyName("version_entitlement")]
        public VersionEntitlement? VersionEntitlement { get; init; }
    }
}
