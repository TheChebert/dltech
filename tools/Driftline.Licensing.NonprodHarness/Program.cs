using System.Net;
using System.Text.Json;
using Driftline.Licensing;

var mode = args.FirstOrDefault() ?? "lifecycle";
var baseUri = RequiredUri("DRIFTLINE_TEST_BASE_URL");
var productId = Required("DRIFTLINE_TEST_PRODUCT_ID");
var issuer = Required("DRIFTLINE_TEST_ISSUER");
var statePath = Required("DRIFTLINE_TEST_STATE_PATH");
var platform = Environment.GetEnvironmentVariable("DRIFTLINE_TEST_PLATFORM") ?? "windows";
var appVersion = Environment.GetEnvironmentVariable("DRIFTLINE_TEST_APP_VERSION") ?? "0.0.0-nonprod-harness";
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
var client = new DriftlineLicensingClient(new HttpClient(), new()
{
    BaseUri = baseUri,
    ProductId = productId,
    EntitlementIssuer = issuer,
    Timeout = TimeSpan.FromSeconds(20),
});

switch (mode)
{
    case "lifecycle":
        await Lifecycle();
        break;
    case "validate":
        await ValidateState();
        break;
    case "cleanup":
        await Cleanup();
        break;
    default:
        throw new InvalidOperationException($"Unknown harness mode: {mode}");
}

async Task Lifecycle()
{
    var key = Required("DRIFTLINE_TEST_LICENSE_KEY");
    var expectedLimit = int.Parse(Environment.GetEnvironmentVariable("DRIFTLINE_TEST_ACTIVATION_LIMIT") ?? "3");
    var active = new List<HarnessActivation>();
    ActivationResponse? firstResponse = null;
    for (var index = 0; index < expectedLimit; index++)
    {
        var installationId = Guid.NewGuid().ToString();
        var response = await client.ActivateAsync(new(
            key, installationId, platform, appVersion, $".NET nonprod harness {index + 1}"));
        firstResponse ??= response;
        active.Add(new(installationId, response.ActivationToken));
    }

    var rejected = false;
    try
    {
        await client.ActivateAsync(new(key, Guid.NewGuid().ToString(), platform, appVersion, ".NET nonprod harness limit"));
    }
    catch (DriftlineApiException exception) when (exception.Code == "activation_limit_reached")
    {
        rejected = true;
    }
    Assert(rejected, "Expected activation_limit_reached for the next distinct installation.");

    var first = active[0];
    var validation = await client.ValidateAsync(new(first.ActivationToken, first.InstallationId, platform, appVersion));
    Assert(validation.Valid, "Validation did not return valid=true.");

    var expectedFeatures = (Environment.GetEnvironmentVariable("DRIFTLINE_TEST_EXPECTED_FEATURES") ?? "")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Order(StringComparer.Ordinal)
        .ToArray();
    if (expectedFeatures.Length > 0)
    {
        var actualFeatures = validation.Entitlement.Features.Order(StringComparer.Ordinal).ToArray();
        Assert(actualFeatures.SequenceEqual(expectedFeatures, StringComparer.Ordinal),
            $"Feature contract mismatch. Expected [{string.Join(", ", expectedFeatures)}], " +
            $"received [{string.Join(", ", actualFeatures)}].");
    }

    var localOptions = new EntitlementVerificationOptions(productId, issuer, first.InstallationId);
    var local = EntitlementEvaluator.ResolveLocalAccess(
        validation.EntitlementToken, validation.VerificationKeys, localOptions);
    Assert(local.State == "entitled", "Cached-key local evaluation did not authorize.");
    Assert(!local.RefreshDue, "Fresh non-production entitlement was unexpectedly refresh-due.");

    var refreshDue = EntitlementEvaluator.Evaluate(
        validation.EntitlementToken,
        validation.VerificationKeys,
        localOptions with { Now = DateTimeOffset.FromUnixTimeSeconds(validation.Entitlement.RefreshAfter + 1) });
    Assert(refreshDue.State == "refresh_due" && refreshDue.Authorized, "Perpetual refresh-due authorization was not preserved.");

    foreach (var failure in new Exception[]
    {
        new TaskCanceledException("timeout"),
        new HttpRequestException("network"),
        new DriftlineApiException("rate_limited", 429, 120),
        new DriftlineApiException("request_failed", 503),
    })
    {
        var disposition = ValidationPolicy.Classify(failure);
        Assert(disposition.State == "stale_but_authorized" && disposition.PreserveAuthorization,
            $"Transient failure {failure.GetType().Name} did not preserve authorization.");
    }

    await client.DeactivateAsync(new(first.ActivationToken, first.InstallationId, platform, "nonprod_harness"));
    try
    {
        await client.ValidateAsync(new(first.ActivationToken, first.InstallationId, platform, appVersion));
        throw new InvalidOperationException("Deactivated token unexpectedly validated.");
    }
    catch (DriftlineApiException exception) when (exception.Code == "invalid_activation")
    {
    }

    active.RemoveAt(0);
    var replacementInstallation = Guid.NewGuid().ToString();
    var replacement = await client.ActivateAsync(new(
        key, replacementInstallation, platform, appVersion, ".NET nonprod harness replacement"));
    active.Add(new(replacementInstallation, replacement.ActivationToken));

    var state = new HarnessState(firstResponse!.Entitlement.Subject, active);
    await File.WriteAllTextAsync(statePath, JsonSerializer.Serialize(state, jsonOptions));
    Console.WriteLine(JsonSerializer.Serialize(new
    {
        status = "ok",
        license_id = state.LicenseId,
        activations = active.Count,
        activation_limit_rejected = true,
        cached_key_offline = true,
        refresh_due_authorized = true,
        deactivation_replacement = true,
        feature_contract_verified = expectedFeatures.Length > 0,
    }));
}

async Task ValidateState()
{
    var state = await LoadState();
    var activation = state.Active[0];
    var expectedError = Environment.GetEnvironmentVariable("DRIFTLINE_TEST_EXPECT_ERROR");
    try
    {
        var response = await client.ValidateAsync(new(
            activation.ActivationToken, activation.InstallationId, platform, appVersion));
        if (!string.IsNullOrWhiteSpace(expectedError))
            throw new InvalidOperationException($"Expected {expectedError}, but validation succeeded.");
        Console.WriteLine(JsonSerializer.Serialize(new { status = "ok", validated = response.Valid }));
    }
    catch (DriftlineApiException exception) when (exception.Code == expectedError)
    {
        Console.WriteLine(JsonSerializer.Serialize(new { status = "ok", expected_error = exception.Code }));
    }
}

async Task Cleanup()
{
    var state = await LoadState();
    var deactivated = 0;
    foreach (var activation in state.Active)
    {
        try
        {
            await client.DeactivateAsync(new(
                activation.ActivationToken, activation.InstallationId, platform, "nonprod_harness_cleanup"));
            deactivated++;
        }
        catch (DriftlineApiException exception) when (exception.Code == "invalid_activation")
        {
        }
    }
    Console.WriteLine(JsonSerializer.Serialize(new { status = "ok", deactivated }));
}

async Task<HarnessState> LoadState() =>
    JsonSerializer.Deserialize<HarnessState>(await File.ReadAllTextAsync(statePath), jsonOptions)
    ?? throw new InvalidOperationException("Harness state is empty.");

static string Required(string name) =>
    Environment.GetEnvironmentVariable(name) is { Length: > 0 } value
        ? value
        : throw new InvalidOperationException($"Missing environment variable: {name}");

static Uri RequiredUri(string name)
{
    var value = new Uri(Required(name), UriKind.Absolute);
    if (value.Scheme != Uri.UriSchemeHttps) throw new InvalidOperationException($"{name} must use HTTPS.");
    return value;
}

static void Assert(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

record HarnessActivation(string InstallationId, string ActivationToken);
record HarnessState(string LicenseId, List<HarnessActivation> Active);
