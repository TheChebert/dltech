"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");

    try {
      const supabase = createClient();
      const redirectTo = window.location.origin + "/auth/callback?next=/account/dashboard";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      if (error) throw error;
      setState("sent");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Sign-in could not be started.");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-emerald-950" role="status">
        <CheckCircle2 className="size-7 text-emerald-600" />
        <h2 className="mt-5 text-xl font-semibold">Check your email</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900/80">Use the secure sign-in link sent to {email}. The link is time-limited.</p>
        <button type="button" onClick={() => setState("idle")} className="mt-5 text-sm font-semibold underline underline-offset-4">Use a different email</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface-panel rounded-2xl border border-slate-300/80 p-7 shadow-[0_20px_65px_rgba(11,22,38,.09)]">
      <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Mail className="size-5" /></span>
      <h2 className="mt-6 text-2xl font-semibold text-slate-950">Sign in with a secure link</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">Enter the email address associated with your Driftline account. No password is sent or stored by this form.</p>
      <label className="mt-6 grid gap-2 text-sm font-medium text-slate-800">
        Email address
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required maxLength={254} className="h-12 rounded-lg border border-slate-300 bg-[#edf2f7] px-3 text-base focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-100" />
      </label>
      {state === "error" ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{message}</p> : null}
      <button disabled={state === "sending"} type="submit" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
        {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : null}
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
