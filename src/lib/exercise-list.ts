import type { DateString } from "./date";
import type { Exercise } from "./types";

export type ExerciseTotal = {
  exercise_id: string;
  sets: number;
  sessions: number;
  last_done: DateString;
};

export type OrderRow = { exercise_id: string; position: number };

export type ListedExercise = {
  exercise: Exercise;
  sets: number;
  sessions: number;
  last_done: DateString;
  /** True when the user has placed this one by hand. */
  pinned: boolean;
};

/**
 * Most-logged first by default, with any hand-placed exercises above that.
 *
 * Manual positions win where they exist, so reordering sticks. Anything logged
 * after the last reorder has no position and falls in below by set count — a
 * new movement appears without silently jumping the order the user chose.
 */
export function sortExercises(
  totals: ExerciseTotal[],
  order: OrderRow[],
  exercisesById: Map<string, Exercise>,
): ListedExercise[] {
  const positions = new Map(order.map((o) => [o.exercise_id, o.position]));

  const listed: ListedExercise[] = [];
  for (const t of totals) {
    const exercise = exercisesById.get(t.exercise_id);
    if (!exercise) continue; // deleted custom exercise; nothing to link to
    listed.push({
      exercise,
      sets: t.sets,
      sessions: t.sessions,
      last_done: t.last_done,
      pinned: positions.has(t.exercise_id),
    });
  }

  return listed.sort((a, b) => {
    const pa = positions.get(a.exercise.id);
    const pb = positions.get(b.exercise.id);

    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;

    if (b.sets !== a.sets) return b.sets - a.sets;
    return a.exercise.name.localeCompare(b.exercise.name);
  });
}

/** Move one item by one place, returning a new array. */
export function moveBy<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items;
  }
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Positions for the whole visible list, not just the moved row.
 *
 * Writing every row keeps the stored order total rather than sparse — a sparse
 * order would let an unpinned exercise sort above a pinned one as set counts
 * change.
 */
export function positionsFor(listed: ListedExercise[]): OrderRow[] {
  return listed.map((l, i) => ({ exercise_id: l.exercise.id, position: i }));
}
