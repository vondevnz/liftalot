import { describe, expect, it } from "vitest";
import { deriveName, describeExercises, summarize, type WorkoutRow } from "./workout-summary";

const entry = (id: string, name: string, muscle_group: string) => ({
  id,
  exercise_id: `ex-${name}`,
  exercises: { name, muscle_group },
});

const row = (name: string | null, entries: ReturnType<typeof entry>[]): WorkoutRow => ({
  id: "w1",
  date: "2026-08-17",
  started_at: "2026-08-17T18:15:00Z",
  name,
  set_entries: entries,
});

describe("deriveName", () => {
  it("names a single-group session after that group", () => {
    expect(deriveName(["Legs", "Legs", "Legs"])).toBe("Legs");
  });

  it("joins the two commonest groups, dropping the rest", () => {
    // Chest 3, Arms 2, Core 1 — Core is real but a three-part label is unreadable.
    expect(deriveName(["Chest", "Chest", "Chest", "Arms", "Arms", "Core"])).toBe(
      "Chest & Arms",
    );
  });

  it("puts the commonest group first", () => {
    expect(deriveName(["Back", "Chest", "Chest"])).toBe("Chest & Back");
  });

  it("breaks a tie alphabetically so the label is stable", () => {
    expect(deriveName(["Arms", "Chest"])).toBe("Arms & Chest");
    expect(deriveName(["Chest", "Arms"])).toBe("Arms & Chest");
  });

  it("falls back when there is nothing to go on", () => {
    expect(deriveName([])).toBe("Workout");
  });
});

describe("summarize", () => {
  it("prefers the name the user gave", () => {
    const s = summarize(row("Push", [entry("1", "Bench Press", "Chest")]));
    expect(s.name).toBe("Push");
    expect(s.named).toBe(true);
  });

  it("derives a name for an unnamed session", () => {
    const s = summarize(
      row(null, [entry("1", "Back Squat", "Legs"), entry("2", "Leg Press", "Legs")]),
    );
    expect(s.name).toBe("Legs");
    expect(s.named).toBe(false);
  });

  it("treats a blank name as unnamed", () => {
    const s = summarize(row("   ", [entry("1", "Deadlift", "Back")]));
    expect(s.name).toBe("Back");
    expect(s.named).toBe(false);
  });

  it("lists each exercise once, in the order logged", () => {
    const s = summarize(
      row(null, [
        entry("1", "Bench Press", "Chest"),
        entry("2", "Bench Press", "Chest"),
        entry("3", "Lateral Raise", "Shoulders"),
      ]),
    );
    expect(s.exerciseNames).toEqual(["Bench Press", "Lateral Raise"]);
    expect(s.setCount).toBe(3);
  });
});

describe("describeExercises", () => {
  it("summarises the tail", () => {
    expect(describeExercises(["A", "B", "C", "D"])).toBe("A, B +2");
  });

  it("omits the counter when everything fits", () => {
    expect(describeExercises(["A", "B"])).toBe("A, B");
  });

  it("handles an empty list", () => {
    expect(describeExercises([])).toBe("No exercises");
  });
});
