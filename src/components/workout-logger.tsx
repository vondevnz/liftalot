"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ExercisePicker } from "./exercise-picker";
import { SaveTemplateDialog } from "./save-template-dialog";
import { TemplatePicker } from "./template-picker";
import { createClient } from "@/lib/supabase/client";
import { formatDayLabel, weekdayName, type DateString } from "@/lib/date";
import { useUnit } from "@/lib/unit-context";
import { displayWeight, formatWeight, toKg } from "@/lib/units";
import type {
  Exercise,
  Prefill,
  SetEntry,
  TemplateWithEntries,
} from "@/lib/types";
import type { Unit } from "@/lib/units";

type Props = {
  workoutId: string;
  date: DateString;
  initialSets: SetEntry[];
  initialName: string | null;
  exercises: Exercise[];
  templates: TemplateWithEntries[];
};

export function WorkoutLogger({
  workoutId,
  date,
  initialSets,
  initialName,
  exercises,
  templates,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const unit = useUnit();

  const [sets, setSets] = useState<SetEntry[]>(initialSets);
  // Exercises chosen but not yet given a set have no database row, so the
  // session's running order lives here.
  const [order, setOrder] = useState<string[]>(() => {
    const seen: string[] = [];
    for (const s of initialSets) {
      if (!seen.includes(s.exercise_id)) seen.push(s.exercise_id);
    }
    return seen;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  /** The session's own name — from a loaded template, or from saving one. */
  const [name, setName] = useState<string | null>(initialName);
  /** Set once this session has been saved as a template, to swap the button. */
  const [savedName, setSavedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loading a template writes nothing to the database — it seeds these inputs
  // and lets you log each set as you actually do it.
  const [prefills, setPrefills] = useState<Map<string, Prefill>>(new Map());

  const exerciseById = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const e of exercises) m.set(e.id, e);
    return m;
  }, [exercises]);

  async function addSet(exerciseId: string, weight: number | null, reps: number) {
    const existing = sets.filter((s) => s.exercise_id === exerciseId);
    const setNumber = existing.reduce((max, s) => Math.max(max, s.set_number), 0) + 1;

    // We mint the id ourselves so the optimistic row is the real row — no
    // swapping a temporary key out once the insert returns.
    const row: SetEntry = {
      id: crypto.randomUUID(),
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_number: setNumber,
      // Entered in the user's unit, stored in kilograms — always. Rounded to
      // the column's two decimals here so what we hold optimistically matches
      // what Postgres will hold.
      weight_kg:
        weight === null ? null : Math.round(toKg(weight, unit) * 100) / 100,
      reps,
    };

    setSets((prev) => [...prev, row]);
    setError(null);

    const { error } = await supabase.from("set_entries").insert(row);
    if (error) {
      setSets((prev) => prev.filter((s) => s.id !== row.id));
      setError("Couldn't save that set. Check your connection.");
    } else {
      // The day now counts as a workout in the heatmap.
      router.refresh();
    }
  }

  async function deleteSet(id: string) {
    const snapshot = sets;
    setSets((prev) => prev.filter((s) => s.id !== id));
    setError(null);

    const { error } = await supabase.from("set_entries").delete().eq("id", id);
    if (error) {
      setSets(snapshot);
      setError("Couldn't delete that set.");
    } else {
      router.refresh();
    }
  }

  function pickExercise(exercise: Exercise) {
    setPickerOpen(false);
    setOrder((prev) => (prev.includes(exercise.id) ? prev : [...prev, exercise.id]));
  }

  async function loadTemplate(template: TemplateWithEntries) {
    setTemplatesOpen(false);
    setName(template.name);
    const entries = [...template.template_entries].sort(
      (a, b) => a.position - b.position,
    );

    setPrefills((prev) => {
      const next = new Map(prev);
      for (const e of entries) {
        next.set(e.exercise_id, {
          weight:
            e.target_weight_kg === null
              ? ""
              : String(displayWeight(e.target_weight_kg, unit)),
          reps: e.target_reps === null ? "" : String(e.target_reps),
          targetSets: e.target_sets,
        });
      }
      return next;
    });

    setOrder((prev) => {
      const next = [...prev];
      for (const e of entries) {
        if (!next.includes(e.exercise_id)) next.push(e.exercise_id);
      }
      return next;
    });

    // The session takes the saved workout's name, so it appears as "Push"
    // rather than a derived muscle-group label in history. Cosmetic, so a
    // failure here is not worth interrupting the user for.
    await supabase.from("workouts").update({ name: template.name }).eq("id", workoutId);
    router.refresh();
  }

  async function saveAsTemplate(newName: string): Promise<string | null> {
    const { error } = await supabase.rpc("save_workout_as_template", {
      p_workout_id: workoutId,
      p_name: newName,
    });

    if (error) {
      // 23505 is the case worth naming: the unique index on (user, name).
      if (error.code === "23505") return "You already have a saved workout with that name.";
      return error.message;
    }

    setSaveOpen(false);
    setSavedName(newName);
    // The RPC also stamps it onto the workout, so mirror that locally.
    setName(newName);
    router.refresh();
    return null;
  }

  function finish() {
    router.push("/");
    router.refresh();
  }

  return (
    <main className="px-4 pt-6">
      <header className="mb-5">
        <p className="text-sm text-fg-muted">{formatDayLabel(date)}</p>
        <h1 className="font-brand text-2xl font-semibold tracking-tight">{name ?? "Workout"}</h1>
        <p className="mt-1 text-sm text-fg-dim">
          {sets.length} {sets.length === 1 ? "set" : "sets"} logged
        </p>
      </header>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {order.map((exerciseId) => {
          const exercise = exerciseById.get(exerciseId);
          if (!exercise) return null;
          return (
            <ExerciseBlock
              key={exerciseId}
              exercise={exercise}
              sets={sets.filter((s) => s.exercise_id === exerciseId)}
              prefill={prefills.get(exerciseId)}
              unit={unit}
              onAddSet={(weight, reps) => addSet(exerciseId, weight, reps)}
              onDeleteSet={deleteSet}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mt-3 min-h-14 w-full rounded-2xl border border-dashed border-line text-[15px] font-medium text-accent"
      >
        + Add exercise
      </button>

      {/* Only while nothing is logged: once you are mid-session, loading a plan
          over the top is more likely a misfire than an intention. */}
      {sets.length === 0 && (
        <button
          type="button"
          onClick={() => setTemplatesOpen(true)}
          className="mt-2 min-h-14 w-full rounded-2xl border border-line text-[15px] font-medium text-fg-muted"
        >
          Load a saved workout
        </button>
      )}

      {sets.length > 0 && (
        <>
          {/* Once saved, this becomes a way in to manage it. Leaving it as a
              save button would only ever produce a duplicate-name error. */}
          {savedName ? (
            <Link
              href="/saved"
              className="mt-2 flex min-h-14 w-full items-center justify-center rounded-2xl border border-line text-[15px] font-medium text-fg-muted"
            >
              Saved as “{savedName}” · Manage
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setSaveOpen(true)}
              className="mt-2 min-h-14 w-full rounded-2xl border border-line text-[15px] font-medium text-fg-muted"
            >
              Save as workout
            </button>
          )}
          <button
            type="button"
            onClick={finish}
            className="mt-3 min-h-14 w-full rounded-2xl bg-accent text-[15px] font-semibold text-black active:bg-accent-hover"
          >
            Finish
          </button>
        </>
      )}

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          onPick={pickExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {templatesOpen && (
        <TemplatePicker
          templates={templates}
          exercisesById={exerciseById}
          onPick={loadTemplate}
          onClose={() => setTemplatesOpen(false)}
        />
      )}

      {saveOpen && (
        <SaveTemplateDialog
          defaultName={name ?? weekdayName(date)}
          exerciseCount={new Set(sets.map((s) => s.exercise_id)).size}
          onSave={saveAsTemplate}
          onClose={() => setSaveOpen(false)}
        />
      )}
    </main>
  );
}

function ExerciseBlock({
  exercise,
  sets,
  prefill,
  unit,
  onAddSet,
  onDeleteSet,
}: {
  exercise: Exercise;
  sets: SetEntry[];
  prefill: Prefill | undefined;
  unit: Unit;
  onAddSet: (weight: number | null, reps: number) => void;
  onDeleteSet: (id: string) => void;
}) {
  // Left populated after adding a set: the next set is usually the same
  // numbers, and re-typing them between sets is the tax that stops people
  // logging at all. A loaded template seeds the same fields.
  const [weight, setWeight] = useState(prefill?.weight ?? "");
  const [reps, setReps] = useState(prefill?.reps ?? "");

  const target = prefill?.targetSets;
  const done = target !== undefined && sets.length >= target;

  const repsValue = Number.parseInt(reps, 10);
  const weightValue = weight.trim() === "" ? null : Number.parseFloat(weight);
  const canAdd =
    Number.isFinite(repsValue) &&
    repsValue > 0 &&
    (weightValue === null || Number.isFinite(weightValue));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canAdd) return;
    onAddSet(exercise.is_bodyweight ? null : weightValue, repsValue);
  }

  return (
    <section className="rounded-2xl bg-surface-1 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="min-w-0 font-medium">
          {/* Tapping the name opens this movement's progress over time. */}
          <Link href={`/exercise/${exercise.id}`} className="inline-flex items-center gap-1">
            <span className="truncate">{exercise.name}</span>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-fg-dim" fill="none" aria-hidden="true">
              <path d="M4 18l5-6 4 3 6-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="sr-only">— view progress</span>
          </Link>
        </h2>
        {target === undefined ? (
          <span className="shrink-0 text-xs text-fg-dim">{exercise.equipment}</span>
        ) : (
          /* Planned, not logged — the count only moves when you add a set. */
          <span
            className={`shrink-0 text-xs tabular-nums ${
              done ? "text-accent" : "text-fg-dim"
            }`}
          >
            {sets.length} / {target} sets
          </span>
        )}
      </div>

      {sets.length > 0 && (
        <ul className="mb-3">
          {sets.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 border-b border-line/60 py-2 last:border-b-0"
            >
              <span className="flex items-baseline gap-3">
                <span className="w-5 text-sm tabular-nums text-fg-dim">{i + 1}</span>
                <span className="tabular-nums">
                  {s.weight_kg !== null
                    ? `${formatWeight(s.weight_kg, unit)} × ${s.reps}`
                    : `${s.reps} reps`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onDeleteSet(s.id)}
                aria-label={`Delete set ${i + 1} of ${exercise.name}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-fg-dim"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex gap-2">
        {!exercise.is_bodyweight && (
          <label className="flex-1">
            <span className="sr-only">
              {unit === "kg" ? "Weight in kilograms" : "Weight in pounds"}
            </span>
            <input
              type="number"
              inputMode="decimal"
              /* Half-kilo or one-pound nudges — the smallest plate change in
                 each system. */
              step={unit === "kg" ? "0.5" : "1"}
              min="0"
              placeholder={unit}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-center text-base tabular-nums outline-none placeholder:text-fg-dim focus:border-accent"
            />
          </label>
        )}
        <label className="flex-1">
          <span className="sr-only">Repetitions</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            placeholder="reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-center text-base tabular-nums outline-none placeholder:text-fg-dim focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={!canAdd}
          className="h-12 shrink-0 rounded-xl bg-accent px-5 font-semibold text-black disabled:opacity-30"
        >
          Add
        </button>
      </form>
    </section>
  );
}
