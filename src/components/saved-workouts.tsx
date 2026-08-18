"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExercisePicker } from "./exercise-picker";
import { createClient } from "@/lib/supabase/client";
import { useUnit } from "@/lib/unit-context";
import { displayWeight, toKg, type Unit } from "@/lib/units";
import type { Exercise, TemplateEntry, TemplateWithEntries } from "@/lib/types";

export function SavedWorkouts({
  initialTemplates,
  exercises,
}: {
  initialTemplates: TemplateWithEntries[];
  exercises: Exercise[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const unit = useUnit();
  const [templates, setTemplates] = useState(initialTemplates);
  const [error, setError] = useState<string | null>(null);
  /** Template id whose exercise picker is open, if any. */
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const exerciseById = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const e of exercises) m.set(e.id, e);
    return m;
  }, [exercises]);

  async function rename(id: string, name: string) {
    const trimmed = name.trim();
    if (trimmed === "") return;

    const snapshot = templates;
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, name: trimmed } : t)));
    setError(null);

    const { error } = await supabase
      .from("workout_templates")
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setTemplates(snapshot);
      setError(
        error.code === "23505"
          ? "You already have a saved workout with that name."
          : "Couldn't rename that.",
      );
    }
  }

  async function remove(id: string) {
    const snapshot = templates;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setError(null);

    // Entries go with it via on delete cascade.
    const { error } = await supabase.from("workout_templates").delete().eq("id", id);
    if (error) {
      setTemplates(snapshot);
      setError("Couldn't delete that.");
    }
  }

  async function removeEntry(templateId: string, entryId: string) {
    const snapshot = templates;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? {
              ...t,
              template_entries: t.template_entries.filter((e) => e.id !== entryId),
            }
          : t,
      ),
    );
    setError(null);

    const { error } = await supabase.from("template_entries").delete().eq("id", entryId);
    if (error) {
      setTemplates(snapshot);
      setError("Couldn't remove that exercise.");
    }
  }

  async function addExercise(templateId: string, exercise: Exercise) {
    setAddingTo(null);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    if (template.template_entries.some((e) => e.exercise_id === exercise.id)) {
      setError(`${exercise.name} is already in this workout.`);
      return;
    }

    const entry: TemplateEntry = {
      // Minted here so the optimistic row is the real row.
      id: crypto.randomUUID(),
      template_id: templateId,
      exercise_id: exercise.id,
      position:
        template.template_entries.reduce((max, e) => Math.max(max, e.position), 0) + 1,
      target_sets: 3,
      // No numbers yet — they come from editing here, or from re-saving a
      // session over the top.
      target_weight_kg: null,
      target_reps: null,
    };

    const snapshot = templates;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, template_entries: [...t.template_entries, entry] }
          : t,
      ),
    );
    setError(null);

    const { error } = await supabase.from("template_entries").insert(entry);
    if (error) {
      setTemplates(snapshot);
      setError("Couldn't add that exercise.");
    }
  }

  async function setTargets(
    templateId: string,
    entryId: string,
    patch: { target_weight_kg?: number | null; target_reps?: number | null },
  ) {
    const snapshot = templates;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? {
              ...t,
              template_entries: t.template_entries.map((e) =>
                e.id === entryId ? { ...e, ...patch } : e,
              ),
            }
          : t,
      ),
    );
    setError(null);

    const { error } = await supabase
      .from("template_entries")
      .update(patch)
      .eq("id", entryId);

    if (error) {
      setTemplates(snapshot);
      setError("Couldn't update that.");
    }
  }

  async function setTargetSets(templateId: string, entryId: string, target: number) {
    if (target < 1) return;
    const snapshot = templates;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? {
              ...t,
              template_entries: t.template_entries.map((e) =>
                e.id === entryId ? { ...e, target_sets: target } : e,
              ),
            }
          : t,
      ),
    );
    setError(null);

    const { error } = await supabase
      .from("template_entries")
      .update({ target_sets: target })
      .eq("id", entryId);

    if (error) {
      setTemplates(snapshot);
      setError("Couldn't update that.");
    }
  }

  return (
    <main className="px-4 pt-6">
      <Link href="/history" className="inline-flex min-h-11 items-center text-sm text-fg-muted">
        ← History
      </Link>
      <h1 className="font-brand mb-1 mt-1 text-2xl font-semibold tracking-tight">Saved workouts</h1>
      <p className="mb-5 text-sm text-fg-muted">
        Load these from an empty workout. Loading fills in the numbers — it never
        logs the sets for you.
      </p>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {templates.length === 0 ? (
        <p className="rounded-2xl bg-surface-1 px-4 py-8 text-center text-sm text-fg-muted">
          Nothing saved yet. Log a workout, then tap “Save as workout”.
        </p>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              exerciseById={exerciseById}
              onRename={(name) => rename(t.id, name)}
              onDelete={() => remove(t.id)}
              onRemoveEntry={(entryId) => removeEntry(t.id, entryId)}
              onSetTargetSets={(entryId, n) => setTargetSets(t.id, entryId, n)}
              onSetTargets={(entryId, patch) => setTargets(t.id, entryId, patch)}
              onAddExercise={() => setAddingTo(t.id)}
              unit={unit}
            />
          ))}
        </div>
      )}

      {addingTo && (
        <ExercisePicker
          exercises={exercises}
          onPick={(exercise) => addExercise(addingTo, exercise)}
          onClose={() => setAddingTo(null)}
        />
      )}
    </main>
  );
}

function TemplateCard({
  template,
  exerciseById,
  onRename,
  onDelete,
  onRemoveEntry,
  onSetTargetSets,
  onSetTargets,
  onAddExercise,
  unit,
}: {
  template: TemplateWithEntries;
  exerciseById: Map<string, Exercise>;
  unit: Unit;
  onRename: (name: string) => void;
  onDelete: () => void;
  onRemoveEntry: (entryId: string) => void;
  onSetTargetSets: (entryId: string, target: number) => void;
  onSetTargets: (
    entryId: string,
    patch: { target_weight_kg?: number | null; target_reps?: number | null },
  ) => void;
  onAddExercise: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [confirming, setConfirming] = useState(false);

  const entries = [...template.template_entries].sort((a, b) => a.position - b.position);

  return (
    <section className="rounded-2xl bg-surface-1 p-4">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            /* Commit on blur rather than per keystroke — one write per edit
               instead of one per character. */
            onBlur={() => name.trim() !== template.name && onRename(name)}
            className="h-11 w-full rounded-xl border border-transparent bg-transparent px-2 text-[17px] font-medium outline-none focus:border-line focus:bg-surface-2"
          />
        </label>
        <button
          type="button"
          onClick={() => setConfirming((v) => !v)}
          aria-label={`Delete ${template.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg-dim"
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
            <path
              d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {confirming && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-2 p-2">
          <span className="flex-1 px-1 text-sm text-fg-muted">Delete this?</span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="h-10 rounded-lg px-3 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="h-10 rounded-lg bg-red-500/15 px-3 text-sm font-medium text-red-300"
          >
            Delete
          </button>
        </div>
      )}

      <ul className="mt-2">
        {entries.map((e) => (
          <EntryRow
            key={e.id}
            entry={e}
            exercise={exerciseById.get(e.exercise_id)}
            onRemove={() => onRemoveEntry(e.id)}
            onSetTargetSets={(n) => onSetTargetSets(e.id, n)}
            onSetTargets={(patch) => onSetTargets(e.id, patch)}
            unit={unit}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={onAddExercise}
        className="mt-2 min-h-11 w-full rounded-xl border border-dashed border-line text-sm font-medium text-accent"
      >
        + Add exercise
      </button>
    </section>
  );
}

function EntryRow({
  entry,
  exercise,
  onRemove,
  onSetTargetSets,
  onSetTargets,
  unit,
}: {
  entry: TemplateEntry;
  exercise: Exercise | undefined;
  onRemove: () => void;
  onSetTargetSets: (target: number) => void;
  onSetTargets: (patch: {
    target_weight_kg?: number | null;
    target_reps?: number | null;
  }) => void;
  unit: Unit;
}) {
  const [weight, setWeight] = useState(
    entry.target_weight_kg === null
      ? ""
      : String(displayWeight(entry.target_weight_kg, unit)),
  );
  const [reps, setReps] = useState(
    entry.target_reps === null ? "" : String(entry.target_reps),
  );

  const name = exercise?.name ?? "Unknown exercise";

  /** Blank clears the target; anything unparseable is discarded, not stored. */
  function commit(raw: string, key: "target_weight_kg" | "target_reps") {
    const trimmed = raw.trim();
    if (trimmed === "") return onSetTargets({ [key]: null });

    if (key === "target_reps") {
      const reps = Number.parseInt(trimmed, 10);
      if (Number.isFinite(reps) && reps > 0) onSetTargets({ target_reps: reps });
      return;
    }

    // Typed in the user's unit, stored in kilograms.
    const entered = Number.parseFloat(trimmed);
    if (Number.isFinite(entered) && entered > 0) {
      onSetTargets({ target_weight_kg: Math.round(toKg(entered, unit) * 100) / 100 });
    }
  }

  const fieldClass =
    "h-10 w-20 rounded-lg border border-line bg-surface-2 px-2 text-center text-sm tabular-nums outline-none placeholder:text-fg-dim focus:border-accent";

  return (
    <li className="border-b border-line/60 py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        {exercise ? (
          <Link
            href={`/exercise/${exercise.id}`}
            className="min-w-0 flex-1 truncate text-sm"
          >
            {name}
          </Link>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-fg-dim"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {!exercise?.is_bodyweight && (
          <label>
            <span className="sr-only">
              {`Target weight for ${name}, ${unit === "kg" ? "kilograms" : "pounds"}`}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step={unit === "kg" ? "0.5" : "1"}
              min="0"
              placeholder={unit}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              /* Commit on blur, as the rename field does — one write per edit
                 rather than one per keystroke. */
              onBlur={() => commit(weight, "target_weight_kg")}
              className={fieldClass}
            />
          </label>
        )}
        <label>
          <span className="sr-only">{`Target reps for ${name}`}</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            placeholder="reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onBlur={() => commit(reps, "target_reps")}
            className={fieldClass}
          />
        </label>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onSetTargetSets(entry.target_sets - 1)}
            disabled={entry.target_sets <= 1}
            aria-label={`One fewer set of ${name}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-fg-muted disabled:opacity-30"
          >
            −
          </button>
          <span className="w-11 text-center text-xs tabular-nums text-fg-muted">
            {entry.target_sets} {entry.target_sets === 1 ? "set" : "sets"}
          </span>
          <button
            type="button"
            onClick={() => onSetTargetSets(entry.target_sets + 1)}
            aria-label={`One more set of ${name}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-fg-muted"
          >
            +
          </button>
        </div>
      </div>
    </li>
  );
}
