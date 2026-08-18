import {
  addDays,
  daysBetween,
  monthLabel,
  startOfWeek,
  type DateString,
} from "./date";

/**
 * Roughly three months. Short enough that the cells can be big enough to read
 * and tap on a phone without horizontal scrolling.
 *
 * This only bounds what the grid *draws*. The streak figures are computed from
 * whatever range the page fetches, which is deliberately wider — narrowing it
 * would quietly turn "longest streak" into "longest streak this quarter".
 */
export const DAYS_SHOWN = 92;

/** A grid column: seven days, Sunday first. Trailing nulls pad the current week. */
export type Week = (DateString | null)[];

/**
 * Columns for the grid, oldest first, ending on `today`.
 *
 * Starts on the Sunday on or before the window opens so every column is a
 * whole calendar week and the M/W/F row labels line up with real weekdays.
 */
export function buildWeeks(today: DateString, daysShown = DAYS_SHOWN): Week[] {
  const start = startOfWeek(addDays(today, -(daysShown - 1)));
  const cells: (DateString | null)[] = [];
  for (let d = start; daysBetween(d, today) >= 0; d = addDays(d, 1)) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Week[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export type MonthSegment = { label: string; weeks: number };

/**
 * One label per run of columns in the same month, sized to that run.
 *
 * A column is attributed to the month of its first day, so the label sits at
 * the left edge of the month rather than drifting into the previous one.
 */
export function monthSegments(weeks: Week[]): MonthSegment[] {
  const segments: MonthSegment[] = [];
  for (const week of weeks) {
    const first = week.find(Boolean);
    if (!first) continue;
    const label = monthLabel(first);
    const last = segments[segments.length - 1];
    if (last && last.label === label) last.weeks++;
    else segments.push({ label, weeks: 1 });
  }
  return segments;
}
