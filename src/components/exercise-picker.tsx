"use client";

import { useMemo, useState } from "react";
import { BottomSheet } from "./bottom-sheet";
import type { Exercise } from "@/lib/types";

/**
 * The preset library, searchable. No routines and no programming — picking the
 * movement you are about to do is the whole interaction.
 */
export function ExercisePicker({
  exercises,
  onPick,
  onClose,
}: {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? exercises.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.muscle_group.toLowerCase().includes(q) ||
            e.equipment.toLowerCase().includes(q),
        )
      : exercises;

    const byGroup = new Map<string, Exercise[]>();
    for (const e of matches) {
      const list = byGroup.get(e.muscle_group) ?? [];
      list.push(e);
      byGroup.set(e.muscle_group, list);
    }
    return [...byGroup.entries()];
  }, [exercises, query]);

  return (
    <BottomSheet label="Choose an exercise" onClose={onClose}>
      <div className="shrink-0 px-4 pb-3 pt-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base outline-none placeholder:text-fg-dim focus:border-accent"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {groups.length === 0 && (
          <p className="py-8 text-center text-sm text-fg-muted">
            Nothing matches “{query}”.
          </p>
        )}
        {groups.map(([group, list]) => (
          <div key={group} className="mb-4">
            <h3 className="sticky top-0 bg-surface-1 py-1.5 text-xs font-medium uppercase tracking-wide text-fg-dim">
              {group}
            </h3>
            <ul>
              {list.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onPick(e)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-line/60 py-2.5 text-left"
                  >
                    <span>{e.name}</span>
                    <span className="shrink-0 text-xs text-fg-dim">
                      {e.equipment}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
