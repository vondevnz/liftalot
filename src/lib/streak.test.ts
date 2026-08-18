import { describe, expect, it } from "vitest";
import { currentStreak, levelOf, longestStreak } from "./streak";
import type { ActivityDay } from "./types";

const walk = (date: string): ActivityDay => ({ date, walked: true, has_workout: false });
const lift = (date: string): ActivityDay => ({ date, walked: false, has_workout: true });
const both = (date: string): ActivityDay => ({ date, walked: true, has_workout: true });
const rest = (date: string): ActivityDay => ({ date, walked: false, has_workout: false });

describe("levelOf", () => {
  it("derives the four cell states", () => {
    expect(levelOf(undefined)).toBe(0);
    expect(levelOf(rest("2026-08-17"))).toBe(0);
    expect(levelOf(walk("2026-08-17"))).toBe(1);
    expect(levelOf(lift("2026-08-17"))).toBe(2);
    expect(levelOf(both("2026-08-17"))).toBe(3);
  });
});

describe("currentStreak", () => {
  const today = "2026-08-17";

  it("counts an unbroken run ending today", () => {
    const days = [lift("2026-08-15"), walk("2026-08-16"), both(today)];
    expect(currentStreak(days, today)).toBe(3);
  });

  it("keeps the streak alive when today has not been logged yet", () => {
    // The day is not over. Breaking the streak at 9am is wrong and is the
    // single most demoralising thing this screen could do.
    const days = [lift("2026-08-15"), walk("2026-08-16")];
    expect(currentStreak(days, today)).toBe(2);
  });

  it("breaks once both today and yesterday are empty", () => {
    const days = [lift("2026-08-14"), walk("2026-08-15")];
    expect(currentStreak(days, today)).toBe(0);
  });

  it("treats a walk-only day as a full link in the chain", () => {
    // The whole design rests on this: a rest day from lifting is still a
    // streak day if the user walked.
    const days = [lift("2026-08-14"), walk("2026-08-15"), lift("2026-08-16"), both(today)];
    expect(currentStreak(days, today)).toBe(4);
  });

  it("ignores explicit rest rows", () => {
    const days = [walk("2026-08-15"), rest("2026-08-16"), walk(today)];
    expect(currentStreak(days, today)).toBe(1);
  });

  it("is zero with no history", () => {
    expect(currentStreak([], today)).toBe(0);
  });

  it("counts across a month boundary", () => {
    const days = [walk("2026-07-31"), lift("2026-08-01")];
    expect(currentStreak(days, "2026-08-01")).toBe(2);
  });
});

describe("longestStreak", () => {
  it("finds the best run regardless of input order", () => {
    const days = [
      walk("2026-08-10"),
      lift("2026-08-01"),
      walk("2026-08-02"),
      both("2026-08-03"),
      lift("2026-08-04"),
      walk("2026-08-11"),
    ];
    expect(longestStreak(days)).toBe(4);
  });

  it("is 1 for a single isolated day", () => {
    expect(longestStreak([walk("2026-08-10")])).toBe(1);
  });

  it("is 0 when nothing is active", () => {
    expect(longestStreak([rest("2026-08-10"), rest("2026-08-11")])).toBe(0);
  });
});
