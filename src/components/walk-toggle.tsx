"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DateString } from "@/lib/date";

type Props = {
  userId: string;
  date: DateString;
  walked: boolean;
  /** Called immediately with the new value, then again to revert on failure. */
  onChange: (walked: boolean) => void;
  label?: string;
};

/**
 * One tap, no duration field.
 *
 * A minutes input implies a timer, and a timer implies the app is open during
 * the walk. The column exists in the database for later; the UI stays binary
 * and trusts the user.
 */
export function WalkToggle({ userId, date, walked, onChange, label = "Walked today" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !walked;
    onChange(next); // optimistic: the cell has to flip now, not after a round trip
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("day_logs")
      .upsert(
        { user_id: userId, date, walked: next, updated_at: new Date().toISOString() },
        { onConflict: "user_id,date" },
      );

    setPending(false);
    if (error) {
      onChange(!next);
      setError("Couldn't save. Check your connection.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={walked}
        className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
          walked
            ? "border-accent/40 bg-accent/10"
            : "border-line bg-surface-1"
        } ${pending ? "opacity-80" : ""}`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            walked ? "border-accent bg-accent text-black" : "border-fg-dim"
          }`}
          aria-hidden="true"
        >
          {walked && (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{label}</span>
          <span className="block text-sm text-fg-muted">
            {walked ? "Counts towards your streak" : "An hour on your feet counts"}
          </span>
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
