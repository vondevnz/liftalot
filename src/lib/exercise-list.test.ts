import { describe, expect, it } from "vitest";
import {
  moveBy,
  positionsFor,
  sortExercises,
  type ExerciseTotal,
  type OrderRow,
} from "./exercise-list";
import type { Exercise } from "./types";

const ex = (id: string, name: string): Exercise => ({
  id,
  name,
  muscle_group: "Chest",
  equipment: "Barbell",
  is_bodyweight: false,
});

const byId = new Map<string, Exercise>([
  ["a", ex("a", "Bench Press")],
  ["b", ex("b", "Back Squat")],
  ["c", ex("c", "Deadlift")],
]);

const total = (id: string, sets: number): ExerciseTotal => ({
  exercise_id: id,
  sets,
  sessions: Math.ceil(sets / 3),
  last_done: "2026-08-17",
});

describe("sortExercises", () => {
  it("puts the most-logged first by default", () => {
    const out = sortExercises([total("a", 10), total("b", 30), total("c", 20)], [], byId);
    expect(out.map((l) => l.exercise.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks a tie alphabetically", () => {
    const out = sortExercises([total("a", 10), total("b", 10)], [], byId);
    expect(out.map((l) => l.exercise.name)).toEqual(["Back Squat", "Bench Press"]);
  });

  it("honours a manual order over set count", () => {
    const order: OrderRow[] = [
      { exercise_id: "a", position: 0 },
      { exercise_id: "c", position: 1 },
      { exercise_id: "b", position: 2 },
    ];
    const out = sortExercises([total("a", 1), total("b", 99), total("c", 50)], order, byId);
    expect(out.map((l) => l.exercise.id)).toEqual(["a", "c", "b"]);
  });

  it("keeps hand-placed exercises above unplaced ones", () => {
    // 'a' is pinned last but must still outrank the unpinned 'b', which has far
    // more sets — otherwise a heavy training week would undo the user's order.
    const order: OrderRow[] = [{ exercise_id: "a", position: 5 }];
    const out = sortExercises([total("a", 1), total("b", 99)], order, byId);
    expect(out.map((l) => l.exercise.id)).toEqual(["a", "b"]);
    expect(out[0].pinned).toBe(true);
    expect(out[1].pinned).toBe(false);
  });

  it("drops totals whose exercise no longer exists", () => {
    const out = sortExercises([total("a", 5), total("gone", 99)], [], byId);
    expect(out.map((l) => l.exercise.id)).toEqual(["a"]);
  });

  it("is empty with no history", () => {
    expect(sortExercises([], [], byId)).toEqual([]);
  });
});

describe("moveBy", () => {
  it("swaps with the neighbour", () => {
    expect(moveBy(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveBy(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("refuses to move past either end", () => {
    expect(moveBy(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveBy(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const items = ["a", "b"];
    moveBy(items, 0, 1);
    expect(items).toEqual(["a", "b"]);
  });
});

describe("positionsFor", () => {
  it("numbers the whole list from zero", () => {
    const listed = sortExercises([total("a", 10), total("b", 30)], [], byId);
    expect(positionsFor(listed)).toEqual([
      { exercise_id: "b", position: 0 },
      { exercise_id: "a", position: 1 },
    ]);
  });

  it("round-trips through sortExercises", () => {
    const listed = sortExercises([total("a", 1), total("b", 99), total("c", 50)], [], byId);
    const reordered = moveBy(listed, 0, 1);
    const saved = positionsFor(reordered);
    const resorted = sortExercises(
      [total("a", 1), total("b", 99), total("c", 50)],
      saved,
      byId,
    );
    expect(resorted.map((l) => l.exercise.id)).toEqual(
      reordered.map((l) => l.exercise.id),
    );
  });
});
