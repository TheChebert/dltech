using System.Text.Json;

namespace Driftline.Licensing.Tests;

internal static class SharedVectors
{
    private static readonly JsonDocument Document = JsonDocument.Parse(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "protocol-v1.test-vectors.json")));

    internal static JsonWebKeySet Keys =>
        JsonSerializer.Deserialize<JsonWebKeySet>(Document.RootElement.GetProperty("jwks"), Options)!;

    internal static EntitlementVerificationOptions OptionsFor(string? issuer = null, string? installationId = null)
    {
        var evaluation = Document.RootElement.GetProperty("evaluation");
        return new(
            evaluation.GetProperty("product_id").GetString()!,
            issuer ?? evaluation.GetProperty("issuer").GetString()!,
            installationId ?? evaluation.GetProperty("installation_id").GetString()!,
            DateTimeOffset.FromUnixTimeSeconds(evaluation.GetProperty("now").GetInt64()));
    }

    internal static string Token(string name) => EntitlementCase(name).GetProperty("token").GetString()!;

    internal static JsonElement EntitlementCase(string name) =>
        Document.RootElement.GetProperty("entitlement_cases").EnumerateArray()
            .Single(item => item.GetProperty("name").GetString() == name);

    internal static JsonElement FailureCase(string name) =>
        Document.RootElement.GetProperty("validation_failure_cases").EnumerateArray()
            .Single(item => item.GetProperty("name").GetString() == name);

    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
}
