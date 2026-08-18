"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatShortDate } from "@/lib/date";
import { moveBy, positionsFor, type ListedExercise } from "@/lib/exercise-list";

export function ProgressList({
  userId,
  initial,
}: {
  userId: string;
  initial: ListedExercise[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [listed, setListed] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(index: number, delta: number) {
    const next = moveBy(listed, index, delta);
    if (next === listed) return;

    const snapshot = listed;
    setListed(next);
    setError(null);

    // The whole visible list is written, not just the moved row — a sparse
    // order would let set counts push an unpinned row above a pinned one.
    const rows = positionsFor(next).map((r) => ({ ...r, user_id: userId }));
    const { error } = await supabase
      .from("exercise_order")
      .upsert(rows, { onConflict: "user_id,exercise_id" });

    if (error) {
      setListed(snapshot);
      setError("Couldn't save that order.");
    }
  }

  async function resetOrder() {
    const snapshot = listed;
    // Back to the default: most sets first, ties alphabetical — the same rule
    // sortExercises applies when no positions are stored.
    setListed(
      [...listed]
        .sort((a, b) => b.sets - a.sets || a.exercise.name.localeCompare(b.exercise.name))
        .map((l) => ({ ...l, pinned: false })),
    );
    setError(null);

    const { error } = await supabase.from("exercise_order").delete().eq("user_id", userId);
    if (error) {
      setListed(snapshot);
      setError("Couldn't reset the order.");
    }
  }

  const anyPinned = listed.some((l) => l.pinned);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {editing ? "Move exercises into the order you want." : "Most logged first."}
        </p>
        <div className="flex shrink-0 gap-3">
          {editing && anyPinned && (
            <button type="button" onClick={resetOrder} className="min-h-11 text-sm text-fg-dim">
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="min-h-11 text-sm text-accent"
          >
            {editing ? "Done" : "Reorder"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {listed.map((l, i) => (
          <li key={l.exercise.id} className="flex items-center gap-2 rounded-2xl bg-surface-1 pr-2">
            <Link
              href={`/exercise/${l.exercise.id}`}
              className="flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{l.exercise.name}</span>
                <span className="block truncate text-sm text-fg-muted">
                  {l.sessions} {l.sessions === 1 ? "session" : "sessions"} ·{" "}
                  {l.sets} {l.sets === 1 ? "set" : "sets"}
                </span>
              </span>
              {!editing && (
                <span className="shrink-0 text-xs text-fg-dim">
                  {formatShortDate(l.last_done)}
                </span>
              )}
            </Link>

            {editing && (
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${l.exercise.name} up`}
                  className="flex h-8 w-9 items-center justify-center text-fg-muted disabled:opacity-25"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === listed.length - 1}
                  aria-label={`Move ${l.exercise.name} down`}
                  className="flex h-8 w-9 items-center justify-center text-fg-muted disabled:opacity-25"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
