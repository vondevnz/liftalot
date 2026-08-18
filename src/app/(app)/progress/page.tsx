import { redirect } from "next/navigation";
import { ProgressList } from "@/components/progress-list";
import { createClient } from "@/lib/supabase/server";
import {
  sortExercises,
  type ExerciseTotal,
  type OrderRow,
} from "@/lib/exercise-list";
import type { Exercise } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [totals, order, exercises] = await Promise.all([
    // Aggregated in Postgres by the exercise_totals view rather than by
    // shipping every set row here to be counted.
    supabase.from("exercise_totals").select("exercise_id, sets, sessions, last_done"),
    supabase.from("exercise_order").select("exercise_id, position").order("position"),
    supabase
      .from("exercises")
      .select("id, name, muscle_group, equipment, is_bodyweight"),
  ]);

  const exercisesById = new Map<string, Exercise>(
    ((exercises.data ?? []) as Exercise[]).map((e) => [e.id, e]),
  );

  const listed = sortExercises(
    (totals.data ?? []) as ExerciseTotal[],
    (order.data ?? []) as OrderRow[],
    exercisesById,
  );

  return (
    <main className="px-4 pt-6">
      <h1 className="font-brand mb-1 text-2xl font-semibold tracking-tight">Progress</h1>
      <p className="mb-5 text-sm text-fg-muted">
        Everything you have logged. Tap one for its history.
      </p>

      {listed.length === 0 ? (
        <p className="rounded-2xl bg-surface-1 px-4 py-8 text-center text-sm text-fg-muted">
          Nothing logged yet. Tap + to start a workout.
        </p>
      ) : (
        <ProgressList userId={user.id} initial={listed} />
      )}
    </main>
  );
}
