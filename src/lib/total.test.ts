import { describe, expect, it } from "vitest";
import {
  bestByExercise,
  buildTotalSeries,
  currentTotal,
  mostLogged,
  type DayTop,
} from "./total";

const top = (exercise_id: string, date: string, top_weight: number): DayTop => ({
  exercise_id,
  date,
  top_weight,
});

const history: DayTop[] = [
  top("bench", "2026-08-03", 80),
  top("squat", "2026-08-05", 100),
  top("ohp", "2026-08-07", 45),
  top("bench", "2026-08-10", 85),
  top("squat", "2026-08-12", 110),
  top("ohp", "2026-08-14", 50),
];

const ids = ["bench", "squat", "ohp"];

describe("buildTotalSeries", () => {
  it("accumulates as each lift enters the rotation", () => {
    const series = buildTotalSeries(history, ids);
    expect(series.map((p) => p.value)).toEqual([80, 180, 225, 230, 240, 245]);
  });

  it("never steps down, even after a lighter session", () => {
    // A deload on bench must not drag the total below its previous point.
    const withDeload = [...history, top("bench", "2026-08-17", 60)];
    const series = buildTotalSeries(withDeload, ids);
    for (let i = 1; i < series.length; i++) {
      expect(series[i].value).toBeGreaterThanOrEqual(series[i - 1].value);
    }
    expect(series[series.length - 1].value).toBe(245);
  });

  it("emits one point per date when two lifts share a day", () => {
    const series = buildTotalSeries(
      [top("bench", "2026-08-03", 80), top("squat", "2026-08-03", 100)],
      ids,
    );
    expect(series).toEqual([{ date: "2026-08-03", value: 180 }]);
  });

  it("ignores lifts that are not selected", () => {
    const series = buildTotalSeries(history, ["bench"]);
    expect(series.map((p) => p.value)).toEqual([80, 85]);
  });

  it("sorts unsorted input", () => {
    const shuffled = [history[3], history[0], history[5], history[1]];
    const series = buildTotalSeries(shuffled, ids);
    expect(series.map((p) => p.date)).toEqual([
      "2026-08-03",
      "2026-08-05",
      "2026-08-10",
      "2026-08-14",
    ]);
  });

  it("is empty with nothing selected or nothing logged", () => {
    expect(buildTotalSeries(history, [])).toEqual([]);
    expect(buildTotalSeries([], ids)).toEqual([]);
  });

  it("carries a lift forward through days it was not trained", () => {
    // Squat's 100 must still be in the total on the day only bench moved.
    const series = buildTotalSeries(
      [top("squat", "2026-08-01", 100), top("bench", "2026-08-02", 80)],
      ids,
    );
    expect(series[1].value).toBe(180);
  });
});

describe("bestByExercise", () => {
  it("reports each lift's heaviest", () => {
    const best = bestByExercise(history, ids);
    expect(best.get("bench")).toBe(85);
    expect(best.get("squat")).toBe(110);
    expect(best.get("ohp")).toBe(50);
  });

  it("omits a lift with no history", () => {
    expect(bestByExercise(history, ["deadlift"]).size).toBe(0);
  });
});

describe("buildTotalSeries — 8-week window", () => {
  it("matches the all-time total when everything is inside the window", () => {
    const all = buildTotalSeries(history, ids, "all");
    const win = buildTotalSeries(history, ids, "8w");
    expect(win.map((p) => p.value)).toEqual(all.map((p) => p.value));
  });

  it("decays a lift that drops out of the rotation", () => {
    // Squat last done in May; by the August sessions it has aged out.
    const tops = [
      top("squat", "2026-05-01", 200),
      top("bench", "2026-08-03", 80),
      top("bench", "2026-08-10", 85),
    ];
    const win = buildTotalSeries(tops, ids, "8w");
    expect(win[0].value).toBe(200); // only squat, on its own day
    expect(win[1].value).toBe(80); // squat has aged out
    expect(win[2].value).toBe(85);
  });

  it("can step down, unlike the all-time total", () => {
    const tops = [
      top("bench", "2026-06-01", 100),
      top("bench", "2026-08-17", 70),
    ];
    const win = buildTotalSeries(tops, ids, "8w");
    expect(win[1].value).toBeLessThan(win[0].value);

    const all = buildTotalSeries(tops, ids, "all");
    expect(all[1].value).toBe(100);
  });

  it("includes a session exactly on the window boundary", () => {
    // 56-day window: the 55-day-old session is the oldest that still counts.
    const tops = [top("bench", "2026-06-23", 90), top("squat", "2026-08-17", 100)];
    expect(buildTotalSeries(tops, ids, "8w")[1].value).toBe(190);
  });

  it("excludes a session one day past the boundary", () => {
    const tops = [top("bench", "2026-06-22", 90), top("squat", "2026-08-17", 100)];
    expect(buildTotalSeries(tops, ids, "8w")[1].value).toBe(100);
  });
});

describe("currentTotal — anchoring", () => {
  it("uses all history when the window is 'all'", () => {
    expect(currentTotal(history, ids, "all")).toBe(245);
  });

  it("decays to zero when nothing has been trained recently", () => {
    // Anchored on today, not on the last session — a total that has lapsed
    // should say so rather than freezing at its last value.
    expect(currentTotal(history, ids, "8w", "2026-12-01")).toBe(0);
  });

  it("counts only what is inside the window", () => {
    expect(currentTotal(history, ids, "8w", "2026-08-17")).toBe(245);
    // Cutoff is anchor − 55 days = 11 Aug, so bench's last session (10 Aug)
    // falls out while squat (12th, 110) and OHP (14th, 50) survive.
    expect(currentTotal(history, ids, "8w", "2026-10-05")).toBe(160);
  });
});

describe("mostLogged", () => {
  const candidates = [
    { id: "bench", name: "Bench Press" },
    { id: "squat", name: "Back Squat" },
    { id: "ohp", name: "Overhead Press" },
    { id: "never", name: "Never Done" },
  ];

  it("ranks by how many days each lift was trained", () => {
    const tops = [...history, top("bench", "2026-08-17", 87)];
    expect(mostLogged(tops, candidates)[0]).toBe("bench");
  });

  it("excludes lifts with no history", () => {
    expect(mostLogged(history, candidates)).not.toContain("never");
  });

  it("breaks ties by name so the default does not shuffle", () => {
    // bench, squat and ohp all have two sessions in `history`.
    expect(mostLogged(history, candidates)).toEqual(["squat", "bench", "ohp"]);
  });
});

describe("currentTotal", () => {
  it("sums the bests", () => {
    expect(currentTotal(history, ids)).toBe(245);
  });

  it("matches the last point of the series", () => {
    const series = buildTotalSeries(history, ids);
    expect(currentTotal(history, ids)).toBe(series[series.length - 1].value);
  });

  it("is zero with nothing selected", () => {
    expect(currentTotal(history, [])).toBe(0);
  });
});
