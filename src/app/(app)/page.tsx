import { redirect } from "next/navigation";
import { Lockup } from "@/components/logo";
import { TodayView } from "@/components/today-view";
import { TotalCard } from "@/components/total-card";
import { WorkoutCard } from "@/components/workout-card";
import {
  isTotalWindow,
  mostLogged,
  MAX_TOTAL_LIFTS,
  type DayTop,
  type TotalWindow,
} from "@/lib/total";
import { createClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/supabase/user";
import { addDays, toDateString } from "@/lib/date";
import type { ActivityDay, Exercise } from "@/lib/types";
import {
  summarize,
  WORKOUT_SUMMARY_SELECT,
  type WorkoutRow,
} from "@/lib/workout-summary";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();

  // The server's date is UTC and the viewer's may not be, so the range is
  // fetched with a couple of days of slack at each end and the client narrows
  // it to the real local day. Getting this wrong drops today's own row.
  const serverToday = toDateString(new Date());
  const from = addDays(serverToday, -370);
  const to = addDays(serverToday, 2);

  const [activity, recent, dayTops, totalLifts, exercises, profile] = await Promise.all([
    supabase
      .from("activity_days")
      .select("date, walked, has_workout")
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("workouts")
      .select(WORKOUT_SUMMARY_SELECT)
      .order("date", { ascending: false })
      .order("started_at", { ascending: false })
      .limit(3),
    // One row per lift per day, already aggregated by the view.
    supabase.from("exercise_day_tops").select("exercise_id, date, top_weight"),
    supabase.from("total_lifts").select("exercise_id, position").order("position"),
    supabase
      .from("exercises")
      .select("id, name, muscle_group, equipment, is_bodyweight"),
    supabase.from("profiles").select("total_window").maybeSingle(),
  ]);

  const days = (activity.data ?? []) as ActivityDay[];
  const workouts = ((recent.data ?? []) as WorkoutRow[]).map(summarize);
  const loadError = activity.error ?? recent.error;

  const tops = (dayTops.data ?? []) as DayTop[];
  const allExercises = (exercises.data ?? []) as Exercise[];

  // Only lifts with weighted history can join a sum of kilograms, so bodyweight
  // movements never reach the picker.
  const logged = new Set(tops.map((t) => t.exercise_id));
  const candidates = allExercises
    .filter((e) => logged.has(e.id) && !e.is_bodyweight)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Falls back to the five most-logged, so the card is useful before it has
  // ever been configured.
  const chosen = (totalLifts.data ?? []).map((r) => r.exercise_id as string);
  const selected =
    chosen.length > 0
      ? chosen
      : mostLogged(tops, candidates).slice(0, MAX_TOTAL_LIFTS);

  const totalWindow: TotalWindow = isTotalWindow(profile.data?.total_window)
    ? profile.data.total_window
    : "all";

  return (
    <main className="px-4 pt-6">
      {/* Sign out lives in Settings now that the nav has a slot for it. */}
      <header className="mb-5">
        <h1>
          <Lockup markSize={28} />
        </h1>
        <p className="text-sm text-fg-muted">Move every day. Lift when you can.</p>
      </header>

      {loadError && (
        <p role="alert" className="mb-3 rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-300">
          Couldn&apos;t load your activity. {loadError.message}
        </p>
      )}

      <TodayView userId={userId} serverToday={serverToday} initialDays={days} />

      <div className="mt-3">
        <TotalCard
          userId={userId}
          candidates={candidates}
          initialSelected={selected}
          initialWindow={totalWindow}
          serverToday={serverToday}
          tops={tops}
        />
      </div>

      <section className="mt-7">
        <h2 className="mb-2 text-[15px] font-medium">Recent workouts</h2>
        {workouts.length === 0 ? (
          <p className="rounded-2xl bg-surface-1 px-4 py-6 text-center text-sm text-fg-muted">
            No workouts yet. Tap + to log one.
          </p>
        ) : (
          <div className="space-y-2">
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
