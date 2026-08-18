"use client";

import { useState } from "react";
import { Mark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <Mark size={44} />
        {/* Brand spec: Sora 700, -0.04em. */}
        <h1 className="font-brand mt-4 text-3xl font-bold tracking-[-0.04em]">Liftalot</h1>
        <p className="mt-2 text-fg-muted">Move every day. Lift when you can.</p>

        {status === "sent" ? (
          <div className="mt-10 rounded-2xl bg-surface-1 p-5">
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-sm text-fg-muted">
              We sent a sign-in link to {email}. Open it on this device.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-4 text-sm text-accent"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-3">
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-13 w-full rounded-xl border border-line bg-surface-1 px-4 text-base text-fg outline-none placeholder:text-fg-dim focus:border-accent"
            />
            <button
              type="submit"
              disabled={status === "sending" || email.trim() === ""}
              className="h-13 w-full rounded-xl bg-accent text-base font-semibold text-black transition-colors active:bg-accent-hover disabled:opacity-40"
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <p className="pt-1 text-center text-xs text-fg-dim">
              No password. We email you a link.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
