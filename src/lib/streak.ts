import { addDays, todayLocal, type DateString } from "./date";
import type { ActivityDay, ActivityLevel } from "./types";

/**
 * A day counts if the user walked *or* trained. The two are worth the same,
 * and that equality is the whole point of the app: the walk is the rest-day
 * option, so the streak stops fighting sensible programming.
 */
export function isActive(day: Pick<ActivityDay, "walked" | "has_workout">): boolean {
  return day.walked || day.has_workout;
}

export function levelOf(
  day: Pick<ActivityDay, "walked" | "has_workout"> | undefined,
): ActivityLevel {
  if (!day) return 0;
  return ((day.has_workout ? 2 : 0) + (day.walked ? 1 : 0)) as ActivityLevel;
}

export function activeDateSet(days: ActivityDay[]): Set<DateString> {
  const set = new Set<DateString>();
  for (const d of days) if (isActive(d)) set.add(d.date);
  return set;
}

/**
 * Consecutive active days ending today.
 *
 * If today has no activity yet, counting starts from yesterday instead. Without
 * that grace an untouched grid reads "streak broken" at 9am every morning,
 * which is both wrong and demoralising — the day isn't over. An active today
 * still counts normally.
 */
export function currentStreak(
  days: ActivityDay[],
  today: DateString = todayLocal(),
): number {
  const active = activeDateSet(days);
  let cursor = active.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (active.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** Longest run of consecutive active days anywhere in the supplied range. */
export function longestStreak(days: ActivityDay[]): number {
  const sorted = [...activeDateSet(days)].sort();
  let best = 0;
  let run = 0;
  let prev: DateString | null = null;

  for (const date of sorted) {
    run = prev !== null && addDays(prev, 1) === date ? run + 1 : 1;
    if (run > best) best = run;
    prev = date;
  }
  return best;
}
