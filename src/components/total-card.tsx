"use client";

import { useMemo, useState } from "react";
import { BottomSheet } from "./bottom-sheet";
import { ProgressChart } from "./progress-chart";
import { createClient } from "@/lib/supabase/client";
import { useUnit } from "@/lib/unit-context";
import { useLocalToday } from "@/lib/use-local-today";
import { displayWeight } from "@/lib/units";
import {
  bestByExercise,
  buildTotalSeries,
  currentTotal,
  MAX_TOTAL_LIFTS,
  type DayTop,
  type TotalWindow,
} from "@/lib/total";
import type { DateString } from "@/lib/date";
import type { Exercise } from "@/lib/types";

const WINDOW_LABELS: Record<TotalWindow, string> = {
  all: "Overall",
  "8w": "Last 8 weeks",
};

export function TotalCard({
  userId,
  candidates,
  initialSelected,
  initialWindow,
  serverToday,
  tops,
}: {
  userId: string;
  /** Lifts with weighted history — bodyweight movements can't join a sum of kg. */
  candidates: Exercise[];
  initialSelected: string[];
  initialWindow: TotalWindow;
  serverToday: DateString;
  tops: DayTop[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const unit = useUnit();
  const today = useLocalToday(serverToday);
  const [selected, setSelected] = useState(initialSelected);
  const [windowMode, setWindowMode] = useState<TotalWindow>(initialWindow);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const e of candidates) m.set(e.id, e);
    return m;
  }, [candidates]);

  // Conversion is linear, so summing kilograms and converting once is the same
  // as converting each — and avoids compounding the rounding.
  const points = useMemo(
    () =>
      buildTotalSeries(tops, selected, windowMode).map((p) => ({
        ...p,
        value: displayWeight(p.value, unit),
      })),
    [tops, selected, windowMode, unit],
  );

  const total = displayWeight(currentTotal(tops, selected, windowMode, today), unit);
  const best = useMemo(
    () => bestByExercise(tops, selected, windowMode, today),
    [tops, selected, windowMode, today],
  );

  async function save(next: string[], nextWindow: TotalWindow) {
    const previous = selected;
    const previousWindow = windowMode;
    setSelected(next);
    setWindowMode(nextWindow);
    setEditing(false);
    setError(null);

    function revert() {
      setSelected(previous);
      setWindowMode(previousWindow);
      setError("Couldn't save your changes.");
    }

    // Replace the lift set wholesale — at most five rows, so a diff would be
    // more code than it saves.
    const del = await supabase.from("total_lifts").delete().eq("user_id", userId);
    if (del.error) return revert();

    if (next.length > 0) {
      const { error } = await supabase.from("total_lifts").insert(
        next.map((exercise_id, position) => ({ user_id: userId, exercise_id, position })),
      );
      if (error) return revert();
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, total_window: nextWindow, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) return revert();
  }

  if (candidates.length === 0) return null;

  return (
    <section className="rounded-2xl bg-surface-1 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium">Total</h2>
          <p className="text-xs text-fg-dim">
            {selected.length} {selected.length === 1 ? "lift" : "lifts"} ·{" "}
            {windowMode === "all" ? "best ever" : "best in 8 weeks"}
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2">
          <p className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums">{total}</span>
            <span className="text-sm text-fg-muted">{unit}</span>
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-h-11 text-sm text-accent"
          >
            Edit
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {points.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg-muted">
          {selected.length === 0
            ? "Pick up to five lifts to track a combined total."
            : "Log one of these lifts to start the total."}
        </p>
      ) : (
        <>
          <ProgressChart points={points} metric="weight" unitLabel={` ${unit}`} />

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {selected.map((id) => {
              const exercise = byId.get(id);
              const value = best.get(id);
              if (!exercise) return null;
              return (
                <li
                  key={id}
                  className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-fg-muted"
                >
                  {exercise.name}{" "}
                  <span className="tabular-nums text-fg">
                    {value === undefined ? "—" : displayWeight(value, unit)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {editing && (
        <LiftPicker
          candidates={candidates}
          selected={selected}
          window={windowMode}
          onSave={save}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}

function LiftPicker({
  candidates,
  selected,
  window,
  onSave,
  onClose,
}: {
  candidates: Exercise[];
  selected: string[];
  window: TotalWindow;
  onSave: (next: string[], nextWindow: TotalWindow) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(selected);
  const [draftWindow, setDraftWindow] = useState<TotalWindow>(window);
  const full = draft.length >= MAX_TOTAL_LIFTS;

  function toggle(id: string) {
    setDraft((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_TOTAL_LIFTS
          ? [...prev, id]
          : prev,
    );
  }

  return (
    <BottomSheet label="Choose lifts for your total" onClose={onClose}>
      <div className="shrink-0 px-4 pt-2">
        <h3 className="font-medium">How to count</h3>
        <div role="radiogroup" aria-label="How to count the total" className="mt-2 flex gap-2">
          {(["all", "8w"] as TotalWindow[]).map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={draftWindow === w}
              onClick={() => setDraftWindow(w)}
              className={`min-h-11 flex-1 rounded-xl border text-sm font-medium ${
                draftWindow === w
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface-2 text-fg-muted"
              }`}
            >
              {WINDOW_LABELS[w]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-fg-dim">
          {draftWindow === "all"
            ? "Each lift counts its heaviest ever, so the total only climbs."
            : "Each lift counts its heaviest in the last 8 weeks, so the total falls if one drops out of your rotation."}
        </p>

        <div className="mt-4 flex items-baseline justify-between">
          <h3 className="font-medium">Lifts in your total</h3>
          <span className="text-xs text-fg-dim tabular-nums">
            {draft.length} / {MAX_TOTAL_LIFTS}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <ul>
          {candidates.map((e) => {
            const on = draft.includes(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(e.id)}
                  /* A full list greys out what you can't add, rather than
                     silently ignoring the tap. */
                  disabled={!on && full}
                  className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-line/60 py-2.5 text-left disabled:opacity-35"
                >
                  <span>{e.name}</span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                      on ? "border-accent bg-accent text-black" : "border-fg-dim"
                    }`}
                    aria-hidden="true"
                  >
                    {on && (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
                        <path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          stroke="currentColor" strokeWidth="3"
                          strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex shrink-0 gap-2 px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-xl border border-line font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draft, draftWindow)}
          className="h-12 flex-1 rounded-xl bg-accent font-semibold text-black"
        >
          Save
        </button>
      </div>
    </BottomSheet>
  );
}
