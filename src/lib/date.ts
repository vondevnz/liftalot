/**
 * Every date in Liftalot is a LOCAL calendar date as a `YYYY-MM-DD` string.
 *
 * This module is the only place dates are converted, and nothing anywhere else
 * calls `toISOString()`. The reason is the one bug that quietly kills streak
 * apps: `new Date().toISOString().slice(0, 10)` yields the *UTC* date, so a
 * 10pm session in Auckland is filed under tomorrow, and a 40-day streak breaks
 * for no visible reason. Same trap in reverse for a 1am session in Los Angeles.
 *
 * Postgres `date` columns carry no timezone, so a string produced here
 * round-trips through the database untouched.
 */

export type DateString = string;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar date of the given instant (default: now). */
export function toDateString(d: Date = new Date()): DateString {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today, in the viewer's own timezone. */
export function todayLocal(): DateString {
  return toDateString();
}

/**
 * Local midnight for a date string.
 *
 * Uses the (y, m, d) constructor deliberately. `new Date("2026-08-17")` is
 * parsed as UTC midnight by spec, which lands on the previous day for every
 * timezone west of Greenwich.
 */
export function parseLocalDate(s: DateString): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: DateString, n: number): DateString {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

/**
 * Whole days from `a` to `b` (negative if `b` is earlier).
 *
 * Compares local midnights and rounds, so a DST boundary — where the span is
 * 23 or 25 hours — still counts as one day.
 */
export function daysBetween(a: DateString, b: DateString): number {
  const ms = parseLocalDate(b).getTime() - parseLocalDate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Day of week, 0 = Sunday, matching the heatmap's row order. */
export function dayOfWeek(s: DateString): number {
  return parseLocalDate(s).getDay();
}

/** The Sunday on or before `s` — the top cell of that column in the grid. */
export function startOfWeek(s: DateString): DateString {
  return addDays(s, -dayOfWeek(s));
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Mon 17 Aug" */
export function formatDayLabel(s: DateString): string {
  const d = parseLocalDate(s);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** "17 Aug" — for tooltips and aria-labels where the weekday is noise. */
export function formatShortDate(s: DateString): string {
  const d = parseLocalDate(s);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** "17 August 2026" — page headings. */
export function formatLongDate(s: DateString): string {
  const d = parseLocalDate(s);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "Monday" — the default name when saving a session as a template. */
export function weekdayName(s: DateString): string {
  return parseLocalDate(s).toLocaleDateString(undefined, { weekday: "long" });
}

export function monthLabel(s: DateString): string {
  return MONTH_NAMES[parseLocalDate(s).getMonth()];
}

/**
 * How far back a walk may be logged.
 *
 * People genuinely forget to log yesterday, and losing a 40-day streak to that
 * is the fastest route to a deleted app. Unlimited backfill turns the grid into
 * fiction, so three days is the compromise: enough grace to stay honest.
 */
export const BACKFILL_DAYS = 3;

export function isWithinBackfillWindow(
  s: DateString,
  today: DateString = todayLocal(),
): boolean {
  const delta = daysBetween(s, today);
  return delta >= 0 && delta <= BACKFILL_DAYS;
}
