import type { DateString } from "./date";

export type ActivityDay = {
  date: DateString;
  walked: boolean;
  has_workout: boolean;
};

/**
 * Heatmap cell state. Derived, never stored:
 *   (has_workout ? 2 : 0) + (walked ? 1 : 0)
 */
export type ActivityLevel = 0 | 1 | 2 | 3;

export type Exercise = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_bodyweight: boolean;
};

export type Workout = {
  id: string;
  user_id: string;
  date: DateString;
  started_at: string;
  /** From a loaded template or a save; null for an ad-hoc session. */
  name: string | null;
  notes: string | null;
};

export type SetEntry = {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number;
};

export type DayLog = {
  user_id: string;
  date: DateString;
  walked: boolean;
  walk_minutes: number | null;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  created_at: string;
};

export type TemplateEntry = {
  id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_weight_kg: number | null;
  target_reps: number | null;
};

/** A template plus its entries, as the picker and the manage screen need it. */
export type TemplateWithEntries = WorkoutTemplate & {
  template_entries: TemplateEntry[];
};

/**
 * What loading a template hands to an exercise block. Deliberately not set
 * rows: loading prefills the inputs, it never logs. If it logged, the heatmap
 * cell would go bright the moment you opened the plan rather than when you
 * trained, and the grid would start describing intent instead of fact.
 */
export type Prefill = {
  weight: string;
  reps: string;
  targetSets: number;
};

export const LEVEL_LABELS: Record<ActivityLevel, string> = {
  0: "Rest",
  1: "Walk",
  2: "Workout",
  3: "Walk and workout",
};
