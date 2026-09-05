namespace Driftline.Licensing;

public sealed class DriftlineApiException(
    string code,
    int statusCode,
    int? retryAfterSeconds = null,
    Exception? innerException = null)
    : Exception(code, innerException)
{
    public string Code { get; } = code;
    public int StatusCode { get; } = statusCode;
    public int? RetryAfterSeconds { get; } = retryAfterSeconds;
}

public static class ValidationPolicy
{
    public static int RetryDelaySeconds(int attempt) => attempt switch
    {
        <= 0 => 3_600,
        1 => 21_600,
        _ => 86_400,
    };

    public static ValidationDisposition Classify(Exception exception, int attempt = 0)
    {
        if (exception is DriftlineApiException apiError)
        {
            var state = apiError.Code switch
            {
                "license_revoked" => "revoked",
                "license_suspended" or "entitlement_suspended" => "suspended",
                "entitlement_refunded" => "refunded",
                "invalid_activation" => "invalid_activation",
                _ => null,
            };
            if (state is not null)
            {
                return new(state, false, Reason: apiError.Code);
            }

            if (apiError.StatusCode is 401 or 403)
            {
                return new("server_denied", false, Reason: apiError.Code);
            }

            if (apiError.StatusCode is 408 or 429 || apiError.StatusCode >= 500)
            {
                return new(
                    "stale_but_authorized",
                    true,
                    apiError.RetryAfterSeconds ?? RetryDelaySeconds(attempt));
            }
        }

        return new("stale_but_authorized", true, RetryDelaySeconds(attempt));
    }
}
