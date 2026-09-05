using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Driftline.Licensing.Tests;

public sealed class DriftlineLicensingClientTests
{
    [Fact]
    public async Task OptionalFreeResolverUsesCanonicalRoute()
    {
        var client = Client(async (request, cancellationToken) =>
        {
            Assert.Equal("/api/v1/entitlements/resolve", request.RequestUri!.AbsolutePath);
            var body = await request.Content!.ReadAsStringAsync(cancellationToken);
            Assert.Contains("\"productId\":\"metatweak\"", body);
            Assert.Contains("\"editionId\":\"free\"", body);
            return JsonResponse(EntitlementJson(string.Empty));
        });
        var result = await client.ResolveFreeAsync("1.0.0");
        Assert.NotEmpty(result.EntitlementToken);
    }

    [Fact]
    public async Task ActivateRequestSerializesCanonicalProof()
    {
        string? body = null;
        var client = Client(async (request, cancellationToken) =>
        {
            body = await request.Content!.ReadAsStringAsync(cancellationToken);
            Assert.Equal("/api/v1/licenses/activate", request.RequestUri!.AbsolutePath);
            return JsonResponse(ActivationJson());
        });

        await client.ActivateAsync(new("DLT-TEST", "installation", "windows", "1.0.0", "Test PC"));
        using var json = JsonDocument.Parse(body!);
        var root = json.RootElement;
        Assert.Equal("metatweak", root.GetProperty("productId").GetString());
        Assert.Equal("DLT-TEST", root.GetProperty("licenseKey").GetString());
        Assert.Equal("installation", root.GetProperty("installationId").GetString());
        Assert.True(Guid.TryParse(root.GetProperty("nonce").GetString(), out _));
        Assert.True(DateTimeOffset.TryParse(root.GetProperty("timestamp").GetString(), out _));
    }

    [Fact]
    public async Task ActivationResponseParses()
    {
        var result = await Client((_, _) => Task.FromResult(JsonResponse(ActivationJson())))
            .ActivateAsync(new("key", "installation", "windows", "1.0.0"));
        Assert.Equal("activation-token", result.ActivationToken);
        Assert.Equal(SharedVectors.Token("valid_perpetual"), result.EntitlementToken);
        Assert.Single(result.VerificationKeys.Keys);
    }

    [Fact]
    public async Task ValidationResponseParses()
    {
        var client = Client((request, _) =>
        {
            Assert.Equal("/api/v1/licenses/validate", request.RequestUri!.AbsolutePath);
            return Task.FromResult(JsonResponse(ValidationJson()));
        });
        var result = await client.ValidateAsync(new("activation", "installation", "windows", "1.0.0"));
        Assert.True(result.Valid);
        Assert.Equal(2026, result.ValidatedAt.Year);
    }

    [Fact]
    public async Task DeactivationRequestAndResponseAreTyped()
    {
        var client = Client(async (request, cancellationToken) =>
        {
            Assert.Equal("/api/v1/licenses/deactivate", request.RequestUri!.AbsolutePath);
            var body = await request.Content!.ReadAsStringAsync(cancellationToken);
            Assert.Contains("\"activationToken\":\"activation\"", body);
            return JsonResponse("{\"deactivated\":true,\"deactivatedAt\":\"2026-09-03T12:00:00Z\"}");
        });
        var result = await client.DeactivateAsync(new("activation", "installation", "windows", "user_requested"));
        Assert.True(result.Deactivated);
    }

    [Fact]
    public async Task JwksResponseParses()
    {
        var client = Client((request, _) =>
        {
            Assert.Equal("/api/v1/licensing/jwks", request.RequestUri!.AbsolutePath);
            return Task.FromResult(JsonResponse(JsonSerializer.Serialize(SharedVectors.Keys)));
        });
        Assert.Single((await client.GetVerificationKeysAsync()).Keys);
    }

    [Fact]
    public async Task ApiErrorsAreNormalizedAndRetryAfterParsed()
    {
        var client = Client((_, _) =>
        {
            var response = JsonResponse("{\"error\":\"rate_limited\"}", HttpStatusCode.TooManyRequests);
            response.Headers.RetryAfter = new RetryConditionHeaderValue(TimeSpan.FromMinutes(15));
            return Task.FromResult(response);
        });
        var error = await Assert.ThrowsAsync<DriftlineApiException>(() =>
            client.ValidateAsync(new("activation", "installation", "windows", "1.0.0")));
        Assert.Equal("rate_limited", error.Code);
        Assert.Equal(429, error.StatusCode);
        Assert.Equal(900, error.RetryAfterSeconds);
    }

    [Fact]
    public async Task CancellationIsPropagated()
    {
        var client = Client(async (_, cancellationToken) =>
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            throw new InvalidOperationException();
        });
        using var cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(25));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => client.GetVerificationKeysAsync(cancellation.Token));
    }

    [Fact]
    public async Task ConfiguredTimeoutCancelsRequest()
    {
        var handler = new RecordingHandler(async (_, cancellationToken) =>
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            throw new InvalidOperationException();
        });
        var client = new DriftlineLicensingClient(new HttpClient(handler), Options(TimeSpan.FromMilliseconds(25)));
        var error = await Assert.ThrowsAnyAsync<OperationCanceledException>(() => client.GetVerificationKeysAsync());
        Assert.Equal("stale_but_authorized", ValidationPolicy.Classify(error).State);
    }

    [Fact]
    public void IssuerDefaultsToExactBaseOrigin()
    {
        var client = Client((_, _) => Task.FromResult(JsonResponse("{}")));
        Assert.Equal("https://licensing-nonprod.driftlinetech.com", client.EntitlementIssuer);
    }

    [Fact]
    public void NonHttpsOriginIsRejected()
    {
        Assert.Throws<ArgumentException>(() => new DriftlineLicensingClient(
            new HttpClient(new RecordingHandler((_, _) => Task.FromResult(JsonResponse("{}")))),
            new() { BaseUri = new("http://example.test"), ProductId = "metatweak" }));
    }

    private static DriftlineLicensingClient Client(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> response) =>
        new(new HttpClient(new RecordingHandler(response)), Options());

    private static DriftlineClientOptions Options(TimeSpan? timeout = null) => new()
    {
        BaseUri = new("https://licensing-nonprod.driftlinetech.com"),
        ProductId = "metatweak",
        Timeout = timeout ?? TimeSpan.FromSeconds(5),
    };

    private static HttpResponseMessage JsonResponse(string json, HttpStatusCode status = HttpStatusCode.OK) => new(status)
    {
        Content = new StringContent(json, Encoding.UTF8, "application/json"),
    };

    private static string ActivationJson() => EntitlementJson(
        "\"activationToken\":\"activation-token\",");

    private static string ValidationJson() => EntitlementJson(
        "\"valid\":true,\"validatedAt\":\"2026-09-03T12:00:00Z\",");

    private static string EntitlementJson(string prefix)
    {
        var evaluation = EntitlementEvaluator.Evaluate(
            SharedVectors.Token("valid_perpetual"), SharedVectors.Keys, SharedVectors.OptionsFor());
        return $"{{{prefix}\"entitlementToken\":{JsonSerializer.Serialize(SharedVectors.Token("valid_perpetual"))}," +
               $"\"entitlement\":{JsonSerializer.Serialize(evaluation.Entitlement)}," +
               $"\"verificationKeys\":{JsonSerializer.Serialize(SharedVectors.Keys)}}}";
    }

    private sealed class RecordingHandler(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            response(request, cancellationToken);
    }
}
