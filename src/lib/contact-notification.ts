export type ContactTopic = "project" | "product" | "support" | "consulting" | "other";

type ContactNotificationInput = {
  submissionId: string;
  name: string;
  email: string;
  company: string;
  topic: ContactTopic;
  message: string;
};

export type ContactNotificationResult =
  | { ok: true; providerId: string | null }
  | {
      ok: false;
      reason: "configuration_missing" | "network_error" | "provider_error";
      status?: number;
    };

const topicLabels: Record<ContactTopic, string> = {
  project: "New project",
  product: "Product inquiry",
  support: "Support request",
  consulting: "Technology consulting",
  other: "General inquiry",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendContactNotification(
  input: ContactNotificationInput,
): Promise<ContactNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "configuration_missing" };

  const recipient = process.env.CONTACT_TO_EMAIL ?? "hello@driftlinetech.com";
  const sender =
    process.env.CONTACT_FROM_EMAIL ?? "Driftline Tech Website <website@driftlinetech.com>";
  const topic = topicLabels[input.topic];
  const safeName = singleLine(input.name);
  const subject = "[Website inquiry] " + topic + " — " + safeName;
  const company = input.company.trim() || "Not provided";
  const text = [
    "A new inquiry was submitted at driftlinetech.com.",
    "",
    "Name: " + input.name,
    "Email: " + input.email,
    "Company: " + company,
    "Topic: " + topic,
    "Submission ID: " + input.submissionId,
    "",
    "Message:",
    input.message,
  ].join("\n");
  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0b1626">',
    "<h1>New Driftline Tech website inquiry</h1>",
    "<p><strong>Name:</strong> " + escapeHtml(input.name) + "</p>",
    "<p><strong>Email:</strong> " + escapeHtml(input.email) + "</p>",
    "<p><strong>Company:</strong> " + escapeHtml(company) + "</p>",
    "<p><strong>Topic:</strong> " + escapeHtml(topic) + "</p>",
    "<p><strong>Submission ID:</strong> " + escapeHtml(input.submissionId) + "</p>",
    "<h2>Message</h2>",
    '<p style="white-space:pre-wrap">' + escapeHtml(input.message) + "</p>",
    "</div>",
  ].join("");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "contact-" + input.submissionId,
        "User-Agent": "DriftlineTech/1.0",
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        reply_to: input.email,
        subject,
        text,
        html,
        tags: [
          { name: "source", value: "website-contact" },
          { name: "topic", value: input.topic },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: "provider_error", status: response.status };
    }

    const result = (await response.json()) as { id?: string };
    return { ok: true, providerId: result.id ?? null };
  } catch {
    return { ok: false, reason: "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}
