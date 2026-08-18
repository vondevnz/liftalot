import type { DateString } from "./date";

/**
 * PostgREST returns the embedded exercise as an object for this many-to-one
 * relation, but its generated types widen it to an array. Accept both rather
 * than casting through `unknown` and hoping.
 */
type EmbeddedExercise =
  | { name: string; muscle_group: string }
  | { name: string; muscle_group: string }[]
  | null;

export type WorkoutRow = {
  id: string;
  date: DateString;
  started_at: string;
  name: string | null;
  set_entries: {
    id: string;
    exercise_id: string;
    exercises: EmbeddedExercise;
  }[];
};

export const WORKOUT_SUMMARY_SELECT =
  "id, date, started_at, name, set_entries!inner(id, exercise_id, exercises(name, muscle_group))";

export type WorkoutSummary = {
  id: string;
  date: DateString;
  name: string;
  /** True when the name came from the user rather than being derived. */
  named: boolean;
  setCount: number;
  exerciseNames: string[];
};

function embedded(e: EmbeddedExercise) {
  if (!e) return undefined;
  return Array.isArray(e) ? e[0] : e;
}

/**
 * A label for a session nobody named: the muscle groups actually trained,
 * commonest first. "Chest & Arms" beats "Workout", and beats repeating the date
 * that already sits beside it.
 */
export function deriveName(muscleGroups: string[]): string {
  if (muscleGroups.length === 0) return "Workout";

  const counts = new Map<string, number>();
  for (const g of muscleGroups) counts.set(g, (counts.get(g) ?? 0) + 1);

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([group]) => group);

  // Two groups is the most that stays readable in a card heading.
  return ranked.length === 1 ? ranked[0] : `${ranked[0]} & ${ranked[1]}`;
}

export function summarize(row: WorkoutRow): WorkoutSummary {
  // Preserve first-logged order rather than alphabetising: the order the
  // session happened in is more recognisable at a glance.
  const names: string[] = [];
  const groups: string[] = [];
  for (const s of row.set_entries) {
    const exercise = embedded(s.exercises);
    if (!exercise) continue;
    if (!names.includes(exercise.name)) names.push(exercise.name);
    groups.push(exercise.muscle_group);
  }

  const given = row.name?.trim();
  return {
    id: row.id,
    date: row.date,
    name: given || deriveName(groups),
    named: Boolean(given),
    setCount: row.set_entries.length,
    exerciseNames: names,
  };
}

export function describeExercises(names: string[], shown = 2): string {
  if (names.length === 0) return "No exercises";
  const head = names.slice(0, shown).join(", ");
  const rest = names.length - shown;
  return rest > 0 ? `${head} +${rest}` : head;
}
