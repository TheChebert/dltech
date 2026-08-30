"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

type FormStatus = { type: "idle" | "submitting" | "success" | "error"; message?: string };

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "submitting" });
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Your message could not be sent.");
      form.reset();
      setStatus({ type: "success", message: result.message ?? "Your message has been received." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Your message could not be sent." });
    }
  }

  if (status.type === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-emerald-950" role="status">
        <CheckCircle2 className="size-8 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-5 text-2xl font-semibold">Message received</h2>
        <p className="mt-3 leading-7 text-emerald-900/80">{status.message}</p>
        <button type="button" onClick={() => setStatus({ type: "idle" })} className="mt-6 text-sm font-semibold text-emerald-800 underline underline-offset-4">Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_65px_rgba(11,22,38,.08)] sm:p-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" autoComplete="name" required maxLength={120} />
        <Field label="Work email" name="email" type="email" autoComplete="email" required maxLength={254} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company (optional)" name="company" autoComplete="organization" maxLength={160} />
        <label className="grid gap-2 text-sm font-medium text-slate-800">
          What can we help with?
          <select name="topic" defaultValue="project" className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-100">
            <option value="project">New project</option>
            <option value="product">Driftline product</option>
            <option value="support">Support request</option>
            <option value="consulting">Technology consulting</option>
            <option value="other">Something else</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium text-slate-800">
        How can we help?
        <textarea name="message" required minLength={20} maxLength={4000} rows={7} placeholder="Share the problem, the current situation, and what a useful next step would look like." className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-base leading-7 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-100" />
      </label>
      <div className="hidden" aria-hidden="true">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex gap-3 text-sm leading-6 text-slate-600">
        <input type="checkbox" name="consent" value="true" required className="mt-1 size-4 rounded border-slate-300 accent-blue-600" />
        <span>I agree that Driftline Tech may use this information to respond to my inquiry. See the <a href="/legal/privacy" className="font-medium text-blue-600 underline underline-offset-2">privacy policy</a>.</span>
      </label>
      {status.type === "error" ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{status.message}</p> : null}
      <button type="submit" disabled={status.type === "submitting"} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
        {status.type === "submitting" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {status.type === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  maxLength?: number;
};

function Field({ label, name, type = "text", autoComplete, required, maxLength }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-800">
      {label}
      <input name={name} type={type} autoComplete={autoComplete} required={required} maxLength={maxLength} className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-100" />
    </label>
  );
}
