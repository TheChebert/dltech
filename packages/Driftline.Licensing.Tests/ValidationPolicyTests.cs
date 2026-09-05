namespace Driftline.Licensing.Tests;

public sealed class ValidationPolicyTests
{
    [Fact]
    public void StalePerpetualRemainsAuthorized() => AssertTransient(new HttpRequestException("offline"), 0, 3_600);

    [Fact]
    public void TimeoutIsTransient() => AssertTransient(new TaskCanceledException("timeout"), 0, 3_600);

    [Fact]
    public void DnsFailureIsTransient() => AssertTransient(new HttpRequestException("dns"), 1, 21_600);

    [Fact]
    public void RateLimitIsTransient() => AssertTransient(new DriftlineApiException("rate_limited", 429), 0, 3_600);

    [Fact]
    public void RetryAfterIsHonored() => AssertTransient(new DriftlineApiException("rate_limited", 429, 900), 0, 900);

    [Fact]
    public void ServerFailureIsTransient() => AssertTransient(new DriftlineApiException("request_failed", 503), 2, 86_400);

    [Fact]
    public void Authoritative401IsDenied() => AssertDenial(new DriftlineApiException("license_denied", 401), "server_denied");

    [Fact]
    public void Authoritative403IsDenied() => AssertDenial(new DriftlineApiException("license_denied", 403), "server_denied");

    [Fact]
    public void RevokedIsDenied() => AssertDenial(new DriftlineApiException("license_revoked", 403), "revoked");

    [Fact]
    public void SuspendedIsDenied() => AssertDenial(new DriftlineApiException("license_suspended", 403), "suspended");

    [Fact]
    public void RefundedIsDenied() => AssertDenial(new DriftlineApiException("entitlement_refunded", 403), "refunded");

    [Fact]
    public void InvalidActivationIsDenied() => AssertDenial(new DriftlineApiException("invalid_activation", 401), "invalid_activation");

    [Fact]
    public void RetryScheduleIsBounded()
    {
        Assert.Equal(3_600, ValidationPolicy.RetryDelaySeconds(0));
        Assert.Equal(21_600, ValidationPolicy.RetryDelaySeconds(1));
        Assert.Equal(86_400, ValidationPolicy.RetryDelaySeconds(2));
        Assert.Equal(86_400, ValidationPolicy.RetryDelaySeconds(20));
    }

    private static void AssertTransient(Exception error, int attempt, int retry)
    {
        var result = ValidationPolicy.Classify(error, attempt);
        Assert.Equal("stale_but_authorized", result.State);
        Assert.True(result.PreserveAuthorization);
        Assert.Equal(retry, result.RetryAfterSeconds);
    }

    private static void AssertDenial(Exception error, string state)
    {
        var result = ValidationPolicy.Classify(error);
        Assert.Equal(state, result.State);
        Assert.False(result.PreserveAuthorization);
    }
}
