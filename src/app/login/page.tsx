"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "link";

/**
 * Password first, magic link second.
 *
 * The link is the nicer flow but it depends on an inbox reaching you, and
 * Supabase's built-in email service is rate-limited to a handful an hour — a
 * bad thing to discover while standing at a squat rack. Password sign-in keeps
 * email off the critical path.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  /** Supabase's raw messages are terse; these are the ones worth translating. */
  function explain(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("rate limit") || m.includes("too many"))
      return "Too many attempts. Supabase limits sign-in emails to a few per hour — wait a while, or use a password.";
    if (m.includes("invalid login credentials"))
      return "That email and password don't match an account.";
    if (m.includes("email not confirmed"))
      return "That account hasn't been confirmed yet. Confirm it, or turn off email confirmation in Supabase.";
    return message;
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(explain(error.message));
      setStatus("idle");
      return;
    }
    // refresh() so the server components re-run and see the new session cookie.
    router.push("/");
    router.refresh();
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Derived from wherever the app is actually running, so the same build
      // works on localhost and on the deployed URL.
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(explain(error.message));
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  const inputClass =
    "h-13 w-full rounded-xl border border-line bg-surface-1 px-4 text-base text-fg outline-none placeholder:text-fg-dim focus:border-accent";

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
              className="mt-4 min-h-11 text-sm text-accent"
            >
              Back
            </button>
          </div>
        ) : (
          <form
            onSubmit={mode === "password" ? signInWithPassword : sendLink}
            className="mt-10 space-y-3"
          >
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
              className={inputClass}
            />

            {mode === "password" && (
              <>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  /* current-password so iOS and Android offer the saved one
                     rather than proposing a new password. */
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </>
            )}

            <button
              type="submit"
              disabled={
                status === "working" ||
                email.trim() === "" ||
                (mode === "password" && password === "")
              }
              className="h-13 w-full rounded-xl bg-accent text-base font-semibold text-black transition-colors active:bg-accent-hover disabled:opacity-40"
            >
              {status === "working"
                ? mode === "password"
                  ? "Signing in…"
                  : "Sending…"
                : mode === "password"
                  ? "Sign in"
                  : "Send sign-in link"}
            </button>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setMode(mode === "password" ? "link" : "password");
                setError(null);
              }}
              className="min-h-11 w-full text-center text-sm text-fg-muted"
            >
              {mode === "password"
                ? "Email me a sign-in link instead"
                : "Use a password instead"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
