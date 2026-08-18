import { SavedWorkouts } from "@/components/saved-workouts";
import { createClient } from "@/lib/supabase/server";
import type { Exercise, TemplateWithEntries } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const supabase = await createClient();

  const [templates, exercises] = await Promise.all([
    supabase
      .from("workout_templates")
      .select("id, name, created_at, template_entries(*)")
      .order("name"),
    supabase
      .from("exercises")
      .select("id, name, muscle_group, equipment, is_bodyweight")
      .order("name"),
  ]);

  return (
    <SavedWorkouts
      initialTemplates={(templates.data ?? []) as TemplateWithEntries[]}
      exercises={(exercises.data ?? []) as Exercise[]}
    />
  );
}
