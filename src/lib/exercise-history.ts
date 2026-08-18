import { addDays, daysBetween, parseLocalDate, type DateString } from "./date";

export type FlatSet = {
  date: DateString;
  weight_kg: number | null;
  reps: number;
};

export type SessionPoint = {
  date: DateString;
  /** Heaviest weight that day, or null for a bodyweight movement. */
  topWeight: number | null;
  topReps: number;
  sets: number;
};

/** What the y-axis measures. Bodyweight movements have no weight to plot. */
export type Metric = "weight" | "reps";

export type ChartPoint = { date: DateString; value: number };

/**
 * One point per training day, heaviest set first.
 *
 * Top weight rather than volume or an estimated 1RM: it needs no modelling
 * assumptions, it is the number the lifter actually remembers, and estimated
 * 1RM is explicitly out of scope for this app.
 */
export function buildSessions(sets: FlatSet[]): SessionPoint[] {
  const byDate = new Map<DateString, FlatSet[]>();
  for (const s of sets) {
    const list = byDate.get(s.date) ?? [];
    list.push(s);
    byDate.set(s.date, list);
  }

  return [...byDate.entries()]
    .map(([date, list]) => {
      const weights = list
        .map((s) => s.weight_kg)
        .filter((w): w is number => w !== null);
      return {
        date,
        topWeight: weights.length > 0 ? Math.max(...weights) : null,
        topReps: Math.max(...list.map((s) => s.reps)),
        sets: list.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function toSeries(sessions: SessionPoint[], metric: Metric): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const s of sessions) {
    const value = metric === "weight" ? s.topWeight : s.topReps;
    if (value !== null) points.push({ date: s.date, value });
  }
  return points;
}

/**
 * Horizontal position as a 0–1 fraction of the date range.
 *
 * Calendar time, not session index — so a three-week layoff shows up as a gap
 * rather than being compressed into one flat segment. A single session sits in
 * the middle rather than collapsing onto an edge.
 */
export function dateFraction(
  date: DateString,
  first: DateString,
  last: DateString,
): number {
  const span = daysBetween(first, last);
  if (span <= 0) return 0.5;
  return daysBetween(first, date) / span;
}

/**
 * Axis ticks at round numbers, covering the data.
 *
 * Standard 1/2/5×10ⁿ stepping. toFixed(10) mops up the float drift that
 * otherwise yields ticks like 62.50000000000001.
 */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max === min) {
    // A flat series still needs an axis with height, or the line sits on the
    // frame and the reader can't tell a plateau from a missing scale.
    const pad = Math.max(1, Math.abs(min) * 0.1);
    return niceTicks(min - pad, max + pad, target);
  }

  const raw = (max - min) / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;

  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let v = start; v <= end + step * 1e-9; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

/** First of each month strictly inside the range — the x-axis tick positions. */
export function monthTicks(first: DateString, last: DateString): DateString[] {
  const ticks: DateString[] = [];
  if (daysBetween(first, last) <= 0) return ticks;

  const start = parseLocalDate(first);
  let year = start.getFullYear();
  let month = start.getMonth() + 1; // first boundary after `first`
  if (month > 11) {
    month = 0;
    year++;
  }

  for (;;) {
    const tick = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    if (daysBetween(tick, last) < 0) break;
    ticks.push(tick);
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
  return ticks;
}

/**
 * Whether the range is long enough for month labels to be meaningful. Below
 * this, two month labels would sit almost on top of each other, so the chart
 * labels the endpoints instead.
 */
export function showMonthTicks(first: DateString, last: DateString): boolean {
  return daysBetween(first, last) >= 45;
}

/** Trailing window, so an old-but-long history doesn't squash recent sessions. */
export function withinRange(
  sessions: SessionPoint[],
  days: number,
  today: DateString,
): SessionPoint[] {
  const cutoff = addDays(today, -(days - 1));
  return sessions.filter((s) => s.date >= cutoff);
}
