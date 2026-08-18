"use client";

import Link from "next/link";
import { useState } from "react";
import { WalkToggle } from "./walk-toggle";
import { WorkoutCard } from "./workout-card";
import {
  BACKFILL_DAYS,
  formatLongDate,
  isWithinBackfillWindow,
  type DateString,
} from "@/lib/date";
import { useLocalToday } from "@/lib/use-local-today";
import type { WorkoutSummary } from "@/lib/workout-summary";

export function DayDetail({
  userId,
  date,
  serverToday,
  initialWalked,
  workouts,
}: {
  userId: string;
  date: DateString;
  serverToday: DateString;
  initialWalked: boolean;
  workouts: WorkoutSummary[];
}) {
  const today = useLocalToday(serverToday);
  const [walked, setWalked] = useState(initialWalked);

  const editable = isWithinBackfillWindow(date, today);
  const isToday = date === today;

  return (
    <main className="px-4 pt-6">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-fg-muted">
        ← Today
      </Link>

      <h1 className="font-brand mb-5 mt-1 text-2xl font-semibold tracking-tight">
        {formatLongDate(date)}
      </h1>

      <div className="space-y-3">
        {editable ? (
          <WalkToggle
            userId={userId}
            date={date}
            walked={walked}
            onChange={setWalked}
            label={isToday ? "Walked today" : "Walked this day"}
          />
        ) : (
          <div className="rounded-2xl bg-surface-1 px-4 py-3">
            <p className="font-medium">{walked ? "Walked" : "No walk logged"}</p>
            <p className="mt-0.5 text-sm text-fg-muted">
              {/* Unlimited backfill would turn the grid into fiction. */}
              Walks can only be logged within {BACKFILL_DAYS} days.
            </p>
          </div>
        )}

        <section>
          <h2 className="mb-2 text-[15px] font-medium">Workouts</h2>
          {workouts.length === 0 ? (
            <p className="rounded-2xl bg-surface-1 px-4 py-6 text-center text-sm text-fg-muted">
              Nothing logged this day.
            </p>
          ) : (
            <div className="space-y-2">
              {workouts.map((w) => (
                <WorkoutCard key={w.id} workout={w} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
