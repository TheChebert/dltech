namespace Driftline.Licensing.Tests;

public sealed class EntitlementEvaluatorTests
{
    [Fact]
    public void CorrectIssuerIsAccepted() => AssertState("valid_perpetual", "valid_perpetual", true);

    [Fact]
    public void WrongIssuerIsRejected() => AssertState("wrong_issuer", "invalid", false, "entitlement_issuer_mismatch");

    [Fact]
    public void InstallationBindingIsAccepted() => AssertState("valid_perpetual", "valid_perpetual", true);

    [Fact]
    public void WrongInstallationIsRejected() => AssertState("wrong_installation", "invalid", false, "entitlement_installation_mismatch");

    [Fact]
    public void ValidPerpetualIsAuthorized() => AssertState("valid_perpetual", "valid_perpetual", true);

    [Fact]
    public void RefreshDuePerpetualIsAuthorized() => AssertState("refresh_due_perpetual", "refresh_due", true);

    [Fact]
    public void ValidTimeLimitedIsAuthorized() => AssertState("valid_time_limited", "valid_time_limited", true);

    [Fact]
    public void ExpiredTrialIsDenied() => AssertState("expired_trial", "expired_time_limited", false);

    [Fact]
    public void ExpiredSubscriptionIsDenied() => AssertState("expired_subscription", "expired_time_limited", false);

    [Fact]
    public void TamperedTokenIsRejected() => AssertState("tampered_token", "invalid", false, "invalid_entitlement_signature");

    [Fact]
    public void InvalidSignatureIsRejected() => AssertState("invalid_signature", "invalid", false, "invalid_entitlement_signature");

    [Fact]
    public void CachedPublicKeyVerifiesOffline()
    {
        var result = EntitlementEvaluator.ResolveLocalAccess(
            SharedVectors.Token("valid_perpetual"),
            SharedVectors.Keys,
            SharedVectors.OptionsFor());
        Assert.Equal("entitled", result.State);
        Assert.False(result.RefreshDue);
    }

    [Fact]
    public void FeatureLookupUsesCanonicalIds()
    {
        var result = EntitlementEvaluator.Evaluate(
            SharedVectors.Token("valid_perpetual"),
            SharedVectors.Keys,
            SharedVectors.OptionsFor());
        Assert.True(EntitlementEvaluator.HasFeature(result.Entitlement!, "batch_editing"));
        Assert.False(EntitlementEvaluator.HasFeature(result.Entitlement!, "explorer_integration"));
    }

    [Fact]
    public void FirstEverOfflineLaunchReturnsBaseline()
    {
        var result = EntitlementEvaluator.ResolveLocalAccess(null, null, SharedVectors.OptionsFor());
        Assert.Equal("baseline", result.State);
        Assert.Equal("no_paid_entitlement", result.Reason);
    }

    [Fact]
    public void MissingCachedKeysReturnsBaseline()
    {
        var result = EntitlementEvaluator.ResolveLocalAccess(
            SharedVectors.Token("valid_perpetual"), null, SharedVectors.OptionsFor());
        Assert.Equal("verification_keys_missing", result.Reason);
    }

    [Fact]
    public void VerifyAuthorizedRejectsHardExpiry()
    {
        var error = Assert.Throws<EntitlementVerificationException>(() =>
            EntitlementEvaluator.VerifyAuthorized(
                SharedVectors.Token("expired_trial"), SharedVectors.Keys, SharedVectors.OptionsFor()));
        Assert.Equal("entitlement_expired", error.Code);
    }

    private static void AssertState(string vector, string state, bool authorized, string? reason = null)
    {
        var result = EntitlementEvaluator.Evaluate(
            SharedVectors.Token(vector), SharedVectors.Keys, SharedVectors.OptionsFor());
        Assert.Equal(state, result.State);
        Assert.Equal(authorized, result.Authorized);
        if (reason is not null) Assert.Equal(reason, result.Reason);
    }
}
