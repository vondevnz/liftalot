import Link from "next/link";
import { WorkoutCard } from "@/components/workout-card";
import { createClient } from "@/lib/supabase/server";
import {
  summarize,
  WORKOUT_SUMMARY_SELECT,
  type WorkoutRow,
} from "@/lib/workout-summary";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createClient();

  // WORKOUT_SUMMARY_SELECT inner-joins set_entries, so sessions that were
  // started and abandoned never show up here — the same rule the heatmap uses.
  const { data, error } = await supabase
    .from("workouts")
    .select(WORKOUT_SUMMARY_SELECT)
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(200);

  const workouts = ((data ?? []) as WorkoutRow[]).map(summarize);

  return (
    <main className="px-4 pt-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="font-brand text-2xl font-semibold tracking-tight">History</h1>
        <Link href="/saved" className="min-h-11 text-sm text-accent">
          Saved workouts
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-300">
          Couldn&apos;t load your workouts. {error.message}
        </p>
      )}

      {workouts.length === 0 ? (
        <p className="rounded-2xl bg-surface-1 px-4 py-8 text-center text-sm text-fg-muted">
          No workouts yet. Tap + to log one.
        </p>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}
    </main>
  );
}
