import { notFound } from "next/navigation";
import { WorkoutLogger } from "@/components/workout-logger";
import { createClient } from "@/lib/supabase/server";
import type {
  Exercise,
  SetEntry,
  TemplateWithEntries,
  Workout,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [workoutResult, setsResult, exercisesResult, templatesResult] = await Promise.all([
    supabase.from("workouts").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("set_entries")
      .select("id, workout_id, exercise_id, set_number, weight_kg, reps")
      .eq("workout_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("exercises")
      .select("id, name, muscle_group, equipment, is_bodyweight")
      .order("name"),
    supabase
      .from("workout_templates")
      .select("id, name, created_at, template_entries(*)")
      .order("name"),
  ]);

  // RLS turns another user's workout into an empty result rather than an
  // error, so this covers both "gone" and "not yours".
  const workout = workoutResult.data as Workout | null;
  if (!workout) notFound();

  return (
    <WorkoutLogger
      workoutId={workout.id}
      date={workout.date}
      initialSets={(setsResult.data ?? []) as SetEntry[]}
      initialName={workout.name ?? null}
      exercises={(exercisesResult.data ?? []) as Exercise[]}
      templates={(templatesResult.data ?? []) as TemplateWithEntries[]}
    />
  );
}
