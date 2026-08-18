"use client";

import Link from "next/link";
import { BottomSheet } from "./bottom-sheet";
import { describeExercises } from "@/lib/workout-summary";
import type { Exercise, TemplateWithEntries } from "@/lib/types";

export function TemplatePicker({
  templates,
  exercisesById,
  onPick,
  onClose,
}: {
  templates: TemplateWithEntries[];
  exercisesById: Map<string, Exercise>;
  onPick: (template: TemplateWithEntries) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet label="Load a saved workout" onClose={onClose}>
      <div className="flex shrink-0 items-baseline justify-between px-4 pb-2 pt-2">
        <h2 className="font-medium">Saved workouts</h2>
        <Link href="/saved" className="text-sm text-accent">
          Manage
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {templates.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">
            Nothing saved yet. Log a workout, then tap “Save as workout”.
          </p>
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => {
              const names = [...t.template_entries]
                .sort((a, b) => a.position - b.position)
                .map((e) => exercisesById.get(e.exercise_id)?.name)
                .filter((n): n is string => Boolean(n));

              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onPick(t)}
                    className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{t.name}</span>
                      <span className="block truncate text-sm text-fg-muted">
                        {describeExercises(names, 3)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-fg-dim">
                      {t.template_entries.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
