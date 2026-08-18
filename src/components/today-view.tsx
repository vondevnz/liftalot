"use client";

import { useCallback, useMemo, useState } from "react";
import { ActivityHeatmap } from "./activity-heatmap";
import { StreakStats } from "./streak-stats";
import { WalkToggle } from "./walk-toggle";
import { currentStreak, longestStreak } from "@/lib/streak";
import { useLocalToday } from "@/lib/use-local-today";
import type { DateString } from "@/lib/date";
import type { ActivityDay } from "@/lib/types";

/**
 * Owns the day list so a walk toggle updates the streak counters and the grid
 * cell in the same tick. Splitting the state would mean the cell lags the
 * button, which is exactly the feedback loop the app depends on.
 */
export function TodayView({
  userId,
  serverToday,
  initialDays,
}: {
  userId: string;
  serverToday: DateString;
  initialDays: ActivityDay[];
}) {
  const today = useLocalToday(serverToday);
  const [days, setDays] = useState(initialDays);

  const walkedToday = useMemo(
    () => days.some((d) => d.date === today && d.walked),
    [days, today],
  );

  const setWalked = useCallback(
    (walked: boolean) => {
      setDays((prev) => {
        const existing = prev.find((d) => d.date === today);
        if (existing) {
          return prev.map((d) => (d.date === today ? { ...d, walked } : d));
        }
        return [...prev, { date: today, walked, has_workout: false }];
      });
    },
    [today],
  );

  return (
    <div className="space-y-3">
      <WalkToggle
        userId={userId}
        date={today}
        walked={walkedToday}
        onChange={setWalked}
      />
      <StreakStats
        current={currentStreak(days, today)}
        longest={longestStreak(days)}
      />
      <ActivityHeatmap days={days} today={today} />
    </div>
  );
}
