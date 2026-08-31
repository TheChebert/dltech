import { afterEach, describe, expect, it, vi } from "vitest";

import { sendContactNotification } from "@/lib/contact-notification";

const input = {
  submissionId: "submission-123",
  name: "Ada Lovelace",
  email: "ada@example.com",
  company: "Analytical Engines",
  topic: "project" as const,
  message: "We need a dependable customer portal for our operations team.",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("contact notifications", () => {
  it("does not make a request when Resend is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(sendContactNotification(input)).resolves.toEqual({
      ok: false,
      reason: "configuration_missing",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends an idempotent notification with a safe reply address and escaped HTML", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-api-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email-456" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await sendContactNotification({
      ...input,
      message: "Please review <script>alert('unsafe')</script> before launch.",
    });

    expect(result).toEqual({ ok: true, providerId: "email-456" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options?.headers).toMatchObject({
      "Idempotency-Key": "contact-submission-123",
      "User-Agent": "DriftlineTech/1.0",
    });

    const body = JSON.parse(String(options?.body));
    expect(body.to).toEqual(["hello@driftlinetech.com"]);
    expect(body.reply_to).toBe("ada@example.com");
    expect(body.html).toContain("&lt;script&gt;");
    expect(body.html).not.toContain("<script>");
  });

  it("returns only the provider status when Resend rejects the request", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-api-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "secret provider detail" }), { status: 403 }),
    );

    await expect(sendContactNotification(input)).resolves.toEqual({
      ok: false,
      reason: "provider_error",
      status: 403,
    });
  });
});
