"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "link" | "forgot";

/** Supabase's own default. Anything shorter is rejected server-side. */
const MIN_PASSWORD = 6;

const COPY: Record<Mode, { action: string; working: string }> = {
  signin: { action: "Sign in", working: "Signing in…" },
  signup: { action: "Create account", working: "Creating…" },
  link: { action: "Send sign-in link", working: "Sending…" },
  forgot: { action: "Send reset link", working: "Sending…" },
};

/**
 * Password first, magic link second.
 *
 * The link is the nicer flow but it depends on an inbox reaching you, and
 * Supabase's built-in email service is rate-limited to a handful an hour — a
 * bad thing to discover while standing at a squat rack.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "working" | "sent" | "confirm" | "reset"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  /** Supabase's raw messages are terse; these are the ones worth translating. */
  function explain(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("rate limit") || m.includes("too many"))
      return "Too many attempts. Supabase limits sign-in emails to a few per hour — wait a while, or use a password.";
    if (m.includes("invalid login credentials"))
      return "That email and password don't match an account.";
    if (m.includes("already registered"))
      return "There's already an account with that email. Sign in instead.";
    if (m.includes("email not confirmed"))
      return "That account hasn't been confirmed yet. Check your inbox, or turn off email confirmation in Supabase.";
    if (m.includes("password"))
      return `Password must be at least ${MIN_PASSWORD} characters.`;
    return message;
  }

  function goToApp() {
    // refresh() so the server components re-run and see the new session cookie.
    router.push("/");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setError(null);
    const supabase = createClient();

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // Through the callback so the recovery token is exchanged for a session
        // before the form that uses it renders.
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        setError(explain(error.message));
        setStatus("idle");
      } else {
        setStatus("reset");
      }
      return;
    }

    if (mode === "link") {
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
      return;
    }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(explain(error.message));
        setStatus("idle");
        return;
      }
      goToApp();
      return;
    }

    // signup
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      setStatus("idle");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(explain(error.message));
      setStatus("idle");
      return;
    }

    // With email confirmation ON, Supabase deliberately does not reveal that an
    // address is already taken — it returns a user with no identities instead
    // of an error, to stop the form being used to enumerate accounts.
    if (data.user && data.user.identities?.length === 0) {
      setError("There's already an account with that email. Sign in instead.");
      setStatus("idle");
      return;
    }

    // A session here means confirmation is off and we are already signed in.
    // No session means Supabase sent a confirmation email instead.
    if (data.session) goToApp();
    else setStatus("confirm");
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

        {status === "sent" || status === "confirm" || status === "reset" ? (
          <div className="mt-10 rounded-2xl bg-surface-1 p-5">
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-sm text-fg-muted">
              {status === "sent"
                ? `We sent a sign-in link to ${email}. Open it on this device.`
                : status === "reset"
                  ? `We sent a reset link to ${email}. Open it on this device to choose a new password.`
                  : `We sent a confirmation link to ${email}. Open it to finish creating your account.`}
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
          <form onSubmit={submit} className="mt-10 space-y-3">
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

            {(mode === "signin" || mode === "signup") && (
              <>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={mode === "signup" ? MIN_PASSWORD : undefined}
                  /* new-password on sign-up so the phone offers to generate and
                     save one; current-password on sign-in so it offers the
                     saved one instead of proposing a new one. */
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={
                    mode === "signup" ? `Password (${MIN_PASSWORD}+ characters)` : "Password"
                  }
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
                ((mode === "signin" || mode === "signup") && password === "")
              }
              className="h-13 w-full rounded-xl bg-accent text-base font-semibold text-black transition-colors active:bg-accent-hover disabled:opacity-40"
            >
              {status === "working" ? COPY[mode].working : COPY[mode].action}
            </button>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="flex flex-col items-center gap-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setError(null);
                }}
                className="min-h-11 text-sm text-accent"
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "link" ? "signin" : "link");
                  setError(null);
                }}
                className="min-h-11 text-sm text-fg-muted"
              >
                {mode === "link"
                  ? "Use a password instead"
                  : "Email me a sign-in link instead"}
              </button>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError(null);
                  }}
                  className="min-h-11 text-sm text-fg-dim"
                >
                  Forgot password?
                </button>
              )}
              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className="min-h-11 text-sm text-fg-dim"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
