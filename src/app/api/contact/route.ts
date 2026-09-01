import { NextResponse } from "next/server";
import { z } from "zod";

import { allowRequest, getClientIp, sha256Hex } from "@/lib/api/security";
import { sendContactNotification } from "@/lib/contact-notification";
import { createAdminClient } from "@/lib/supabase/admin";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  company: z.string().trim().max(160).optional().default(""),
  topic: z.enum(["project", "product", "support", "consulting", "other"]),
  message: z.string().trim().min(20).max(4000),
  website: z.string().max(0).optional().default(""),
  consent: z.literal("true"),
});

export async function POST(request: Request) {
  const ipHash = sha256Hex(getClientIp(request));
  if (!(await allowRequest("contact:" + ipHash, 8, 600))) {
    return NextResponse.json(
      { message: "Too many messages were submitted. Please wait before trying again." },
      { status: 429, headers: { "retry-after": "600" } },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ message: "This form requires a JSON request." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The request could not be read." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check the required fields and try again." }, { status: 400 });
  }

  if (parsed.data.website) {
    return NextResponse.json({ message: "Your message has been received." });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  const supabase = createAdminClient();

  const { data: submission, error } = await supabase
    .from("contact_submissions")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company || null,
      topic: parsed.data.topic,
      message: parsed.data.message,
      source_ip: forwarded,
      user_agent: userAgent,
      consented_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !submission) {
    console.error("contact_submission_failed", { code: error?.code ?? "missing_submission" });
    return NextResponse.json(
      { message: "Your message could not be saved. Please call 608-502-0949." },
      { status: 503 },
    );
  }

  const notification = await sendContactNotification({
    submissionId: submission.id,
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company,
    topic: parsed.data.topic,
    message: parsed.data.message,
  });

  if (!notification.ok) {
    console.error("contact_notification_failed", {
      submissionId: submission.id,
      reason: notification.reason,
      status: notification.status,
    });
  }

  return NextResponse.json(
    { message: "Thank you. Driftline Tech will review your message and reply by email." },
    { status: 201 },
  );
}
