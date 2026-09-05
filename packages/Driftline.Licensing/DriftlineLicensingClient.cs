using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Driftline.Licensing;

public sealed record DriftlineClientOptions
{
    public required Uri BaseUri { get; init; }
    public required string ProductId { get; init; }
    public string? EntitlementIssuer { get; init; }
    public TimeSpan Timeout { get; init; } = TimeSpan.FromSeconds(30);

    internal string Issuer => EntitlementIssuer ?? BaseUri.ToString().TrimEnd('/');
}

public sealed class DriftlineLicensingClient(HttpClient httpClient, DriftlineClientOptions options)
{
    private readonly HttpClient _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
    private readonly DriftlineClientOptions _options = Validate(options);

    public string EntitlementIssuer => _options.Issuer;

    /// <summary>
    /// Optional diagnostics/synchronization only. A built-in Free baseline must never depend on this call.
    /// </summary>
    public Task<EntitlementResponse> ResolveFreeAsync(
        string appVersion,
        string editionId = "free",
        CancellationToken cancellationToken = default) =>
        PostAsync<EntitlementResponse>("/api/v1/entitlements/resolve", new
        {
            productId = _options.ProductId,
            editionId,
            appVersion,
        }, cancellationToken);

    public Task<ActivationResponse> ActivateAsync(ActivationRequest input, CancellationToken cancellationToken = default) =>
        PostAsync<ActivationResponse>("/api/v1/licenses/activate", new
        {
            productId = _options.ProductId,
            input.LicenseKey,
            input.InstallationId,
            input.DeviceName,
            input.Platform,
            input.AppVersion,
            nonce = Guid.NewGuid().ToString(),
            timestamp = DateTimeOffset.UtcNow.ToString("O"),
        }, cancellationToken);

    public Task<ValidationResponse> ValidateAsync(ValidationRequest input, CancellationToken cancellationToken = default) =>
        PostAsync<ValidationResponse>("/api/v1/licenses/validate", new
        {
            productId = _options.ProductId,
            input.ActivationToken,
            input.InstallationId,
            input.Platform,
            input.AppVersion,
            nonce = Guid.NewGuid().ToString(),
            timestamp = DateTimeOffset.UtcNow.ToString("O"),
        }, cancellationToken);

    public Task<DeactivationResponse> DeactivateAsync(DeactivationRequest input, CancellationToken cancellationToken = default) =>
        PostAsync<DeactivationResponse>("/api/v1/licenses/deactivate", new
        {
            productId = _options.ProductId,
            input.ActivationToken,
            input.InstallationId,
            input.Platform,
            input.Reason,
            nonce = Guid.NewGuid().ToString(),
            timestamp = DateTimeOffset.UtcNow.ToString("O"),
        }, cancellationToken);

    public async Task<JsonWebKeySet> GetVerificationKeysAsync(CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, BuildUri("/api/v1/licensing/jwks"));
        using var response = await SendAsync(request, cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            throw await CreateApiException(response, "jwks_unavailable", cancellationToken).ConfigureAwait(false);
        }

        return await DeserializeAsync<JsonWebKeySet>(response, cancellationToken).ConfigureAwait(false);
    }

    private async Task<T> PostAsync<T>(string path, object body, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, BuildUri(path))
        {
            Content = new StringContent(JsonSerializer.Serialize(body, JsonDefaults.Options), Encoding.UTF8, "application/json"),
        };
        using var response = await SendAsync(request, cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            throw await CreateApiException(response, "request_failed", cancellationToken).ConfigureAwait(false);
        }

        return await DeserializeAsync<T>(response, cancellationToken).ConfigureAwait(false);
    }

    private async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(_options.Timeout);
        return await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token).ConfigureAwait(false);
    }

    private async Task<T> DeserializeAsync<T>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            var value = await response.Content.ReadFromJsonAsync<T>(JsonDefaults.Options, cancellationToken).ConfigureAwait(false);
            return value ?? throw new JsonException("Empty JSON response.");
        }
        catch (Exception exception) when (exception is JsonException or NotSupportedException)
        {
            throw new DriftlineApiException("invalid_response", (int)response.StatusCode, innerException: exception);
        }
    }

    private static async Task<DriftlineApiException> CreateApiException(
        HttpResponseMessage response,
        string fallbackCode,
        CancellationToken cancellationToken)
    {
        var code = fallbackCode;
        try
        {
            var error = await response.Content.ReadFromJsonAsync<ApiError>(JsonDefaults.Options, cancellationToken).ConfigureAwait(false);
            if (!string.IsNullOrWhiteSpace(error?.Error)) code = error.Error;
        }
        catch (Exception exception) when (exception is JsonException or NotSupportedException)
        {
            // A non-JSON error body still becomes a normalized API error.
        }

        int? retryAfter = response.Headers.RetryAfter?.Delta is { } delta
            ? Math.Max(0, (int)Math.Ceiling(delta.TotalSeconds))
            : response.Headers.RetryAfter?.Date is { } date
                ? Math.Max(0, (int)Math.Ceiling((date - DateTimeOffset.UtcNow).TotalSeconds))
                : null;
        return new(code, (int)response.StatusCode, retryAfter);
    }

    private Uri BuildUri(string path) => new(_options.BaseUri, path);

    private static DriftlineClientOptions Validate(DriftlineClientOptions value)
    {
        ArgumentNullException.ThrowIfNull(value);
        if (!value.BaseUri.IsAbsoluteUri || value.BaseUri.Scheme != Uri.UriSchemeHttps)
            throw new ArgumentException("BaseUri must be an absolute HTTPS URI.", nameof(value));
        if (string.IsNullOrWhiteSpace(value.ProductId))
            throw new ArgumentException("ProductId is required.", nameof(value));
        if (value.Timeout <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(value), "Timeout must be positive.");
        return value;
    }

    private sealed record ApiError
    {
        public string? Error { get; init; }
    }
}

internal static class JsonDefaults
{
    internal static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
    };
}
