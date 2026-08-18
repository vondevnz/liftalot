import { addDays, type DateString } from "./date";
import type { ChartPoint } from "./exercise-history";

export const MAX_TOTAL_LIFTS = 5;

/**
 * 'all' — each lift contributes its heaviest ever. The total only climbs.
 * '8w'  — each lift contributes its heaviest in the trailing 8 weeks, so a lift
 *         that leaves the rotation decays out and the total can fall.
 */
export type TotalWindow = "all" | "8w";

export const WINDOW_DAYS = 56;

export function isTotalWindow(value: unknown): value is TotalWindow {
  return value === "all" || value === "8w";
}

export type DayTop = {
  exercise_id: string;
  date: DateString;
  top_weight: number;
};

/**
 * A running total: on each day any selected lift was trained, the sum of every
 * selected lift's heaviest weight *so far*.
 *
 * Carrying each lift's best forward is what makes the number mean anything —
 * you never train all five on one day, so summing only what happened that
 * session would just track which lifts you happened to do.
 *
 * A lift contributes 0 until its first session, so the line ramps up as each
 * one enters the rotation rather than pretending an untrained lift is a zero
 * you have somehow held all along.
 */
export function buildTotalSeries(
  tops: DayTop[],
  exerciseIds: string[],
  window: TotalWindow = "all",
): ChartPoint[] {
  const selected = new Set(exerciseIds);
  const rows = tops
    .filter((t) => selected.has(t.exercise_id))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (window === "8w") {
    // Each point re-scores from scratch against its own trailing window, which
    // is what lets the line fall — a running maximum could never step down.
    const dates = [...new Set(rows.map((r) => r.date))];
    return dates.map((date) => ({
      date,
      value: sum(bestByExercise(rows, exerciseIds, "8w", date)),
    }));
  }

  const best = new Map<string, number>();
  const points: ChartPoint[] = [];

  let i = 0;
  while (i < rows.length) {
    const date = rows[i].date;
    // Fold in every selected lift trained on this date before emitting, so a
    // day with two of them produces one point, not two.
    while (i < rows.length && rows[i].date === date) {
      const current = best.get(rows[i].exercise_id) ?? 0;
      if (rows[i].top_weight > current) best.set(rows[i].exercise_id, rows[i].top_weight);
      i++;
    }
    points.push({ date, value: round(sum(best)) });
  }

  return points;
}

function sum(values: Map<string, number>): number {
  let total = 0;
  for (const v of values.values()) total += v;
  return round(total);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Each selected lift's contribution — the breakdown behind the total.
 *
 * For '8w', `anchor` is the day the window ends. Sessions after it are ignored
 * too, so the same function serves both the headline (anchored on today) and
 * each historical point (anchored on its own date).
 */
export function bestByExercise(
  tops: DayTop[],
  exerciseIds: string[],
  window: TotalWindow = "all",
  anchor?: DateString,
): Map<string, number> {
  const selected = new Set(exerciseIds);
  const cutoff =
    window === "8w" && anchor ? addDays(anchor, -(WINDOW_DAYS - 1)) : null;

  const best = new Map<string, number>();
  for (const t of tops) {
    if (!selected.has(t.exercise_id)) continue;
    if (cutoff && (t.date < cutoff || (anchor && t.date > anchor))) continue;
    const current = best.get(t.exercise_id) ?? 0;
    if (t.top_weight > current) best.set(t.exercise_id, t.top_weight);
  }
  return best;
}

/**
 * Default picks: the lifts trained on the most days, so the card means
 * something before anyone configures it. Ties break by name to keep the default
 * stable between page loads.
 */
export function mostLogged(
  tops: DayTop[],
  candidates: { id: string; name: string }[],
): string[] {
  const sessions = new Map<string, number>();
  for (const t of tops) {
    sessions.set(t.exercise_id, (sessions.get(t.exercise_id) ?? 0) + 1);
  }

  return candidates
    .filter((c) => sessions.has(c.id))
    .sort(
      (a, b) =>
        (sessions.get(b.id) ?? 0) - (sessions.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .map((c) => c.id);
}

/**
 * The headline number. For '8w' this is anchored on today, not on the last
 * session — so a total that has decayed through inactivity says so, rather than
 * freezing at whatever it was the last time you trained.
 */
export function currentTotal(
  tops: DayTop[],
  exerciseIds: string[],
  window: TotalWindow = "all",
  today?: DateString,
): number {
  return sum(bestByExercise(tops, exerciseIds, window, today));
}
