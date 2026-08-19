"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Mark } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 6;

/**
 * Where a recovery link lands, after /auth/callback has exchanged it for a
 * session. The session is what authorises the change — this page never sees the
 * old password, and updateUser is refused outright without one.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // A link arriving as a hash fragment is processed by the browser client on
    // load rather than by the callback route, so listen as well as check once.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        setHasSession(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setHasSession(Boolean(data.session));
      setChecking(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    // Already signed in on the new credentials — no need to log in again.
    router.push("/");
    router.refresh();
  }

  const inputClass =
    "h-13 w-full rounded-xl border border-line bg-surface-1 px-4 text-base text-fg outline-none placeholder:text-fg-dim focus:border-accent";

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <Mark size={44} />
        <h1 className="font-brand mt-4 text-3xl font-bold tracking-[-0.04em]">
          New password
        </h1>

        {checking ? (
          <p className="mt-6 text-sm text-fg-muted">Checking your link…</p>
        ) : !hasSession ? (
          <div className="mt-8 rounded-2xl bg-surface-1 p-5">
            <p className="font-medium">That link has expired</p>
            <p className="mt-1 text-sm text-fg-muted">
              Recovery links can only be used once, and they time out. Request a new one.
            </p>
            <Link href="/login" className="mt-4 inline-flex min-h-11 items-center text-sm text-accent">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-3">
            <p className="text-sm text-fg-muted">
              Choose a new password. You&apos;ll stay signed in on this device.
            </p>

            <label htmlFor="password" className="sr-only">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              placeholder={`New password (${MIN_PASSWORD}+ characters)`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />

            <label htmlFor="confirm" className="sr-only">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />

            <button
              type="submit"
              disabled={saving || password === "" || confirm === ""}
              className="h-13 w-full rounded-xl bg-accent text-base font-semibold text-black active:bg-accent-hover disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save password"}
            </button>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
