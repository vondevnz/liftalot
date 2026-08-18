import { describe, expect, it } from "vitest";
import {
  buildSessions,
  dateFraction,
  monthTicks,
  niceTicks,
  toSeries,
  showMonthTicks,
  withinRange,
  type FlatSet,
} from "./exercise-history";

const set = (date: string, weight: number | null, reps: number): FlatSet => ({
  date,
  weight_kg: weight,
  reps,
});

describe("buildSessions", () => {
  it("takes the heaviest set of each day", () => {
    const sessions = buildSessions([
      set("2026-08-17", 60, 8),
      set("2026-08-17", 70, 4),
      set("2026-08-17", 65, 6),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].topWeight).toBe(70);
    expect(sessions[0].topReps).toBe(8);
    expect(sessions[0].sets).toBe(3);
  });

  it("sorts chronologically regardless of input order", () => {
    const sessions = buildSessions([
      set("2026-08-20", 60, 5),
      set("2026-08-01", 50, 5),
      set("2026-08-10", 55, 5),
    ]);
    expect(sessions.map((s) => s.date)).toEqual([
      "2026-08-01",
      "2026-08-10",
      "2026-08-20",
    ]);
  });

  it("reports null top weight for a bodyweight movement", () => {
    const sessions = buildSessions([set("2026-08-17", null, 12), set("2026-08-17", null, 10)]);
    expect(sessions[0].topWeight).toBeNull();
    expect(sessions[0].topReps).toBe(12);
  });

  it("ignores null weights when some sets are loaded", () => {
    // A weighted pull-up session mixing loaded and unloaded sets.
    const sessions = buildSessions([set("2026-08-17", null, 10), set("2026-08-17", 20, 5)]);
    expect(sessions[0].topWeight).toBe(20);
  });
});

describe("toSeries", () => {
  const sessions = buildSessions([
    set("2026-08-01", null, 10),
    set("2026-08-02", 60, 5),
  ]);

  it("drops days with nothing to plot for the chosen metric", () => {
    expect(toSeries(sessions, "weight")).toEqual([{ date: "2026-08-02", value: 60 }]);
  });

  it("keeps every day when plotting reps", () => {
    expect(toSeries(sessions, "reps")).toHaveLength(2);
  });
});

describe("dateFraction", () => {
  const first = "2026-06-01";
  const last = "2026-08-30";

  it("anchors the endpoints", () => {
    expect(dateFraction(first, first, last)).toBe(0);
    expect(dateFraction(last, first, last)).toBe(1);
  });

  it("spaces by calendar distance, not session count", () => {
    // Three sessions: two a day apart, one three months later. The pair must
    // stay adjacent rather than being spread evenly across the axis.
    const a = dateFraction("2026-06-01", first, last);
    const b = dateFraction("2026-06-02", first, last);
    const c = dateFraction("2026-08-30", first, last);
    expect(b - a).toBeLessThan(0.02);
    expect(c - b).toBeGreaterThan(0.9);
  });

  it("centres a lone session instead of collapsing it onto an edge", () => {
    expect(dateFraction("2026-08-17", "2026-08-17", "2026-08-17")).toBe(0.5);
  });
});

describe("niceTicks", () => {
  it("produces round numbers covering the data", () => {
    const ticks = niceTicks(52, 97);
    expect(ticks[0]).toBeLessThanOrEqual(52);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(97);
    for (const t of ticks) expect(Number.isInteger(t)).toBe(true);
  });

  it("carries no floating point noise", () => {
    for (const t of niceTicks(0, 1)) {
      expect(String(t).length).toBeLessThan(6);
    }
  });

  it("gives a flat series an axis with height", () => {
    const ticks = niceTicks(60, 60);
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks[0]).toBeLessThan(60);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(60);
  });

  it("is monotonically increasing", () => {
    const ticks = niceTicks(2.5, 88.3);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
    }
  });
});

describe("monthTicks", () => {
  it("marks each month boundary inside the range", () => {
    expect(monthTicks("2026-06-15", "2026-09-10")).toEqual([
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
    ]);
  });

  it("crosses a year boundary", () => {
    expect(monthTicks("2025-11-15", "2026-02-05")).toEqual([
      "2025-12-01",
      "2026-01-01",
      "2026-02-01",
    ]);
  });

  it("returns nothing for a range inside one month", () => {
    expect(monthTicks("2026-08-02", "2026-08-28")).toEqual([]);
  });

  it("returns nothing for a single day", () => {
    expect(monthTicks("2026-08-17", "2026-08-17")).toEqual([]);
  });
});

describe("showMonthTicks", () => {
  it("labels months only once the range is wide enough to separate them", () => {
    expect(showMonthTicks("2026-08-01", "2026-08-20")).toBe(false);
    expect(showMonthTicks("2026-05-01", "2026-08-20")).toBe(true);
  });
});

describe("withinRange", () => {
  const sessions = buildSessions([
    set("2026-05-01", 60, 5),
    set("2026-08-01", 65, 5),
    set("2026-08-17", 70, 5),
  ]);

  it("keeps only the trailing window", () => {
    const kept = withinRange(sessions, 30, "2026-08-17");
    expect(kept.map((s) => s.date)).toEqual(["2026-08-01", "2026-08-17"]);
  });

  it("includes the oldest day of the window", () => {
    expect(withinRange(sessions, 109, "2026-08-17")).toHaveLength(3);
  });
});
