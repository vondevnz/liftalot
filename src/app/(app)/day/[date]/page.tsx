import { notFound, redirect } from "next/navigation";
import { DayDetail } from "@/components/day-detail";
import { createClient } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/supabase/user";
import { toDateString } from "@/lib/date";
import {
  summarize,
  WORKOUT_SUMMARY_SELECT,
  type WorkoutRow,
} from "@/lib/workout-summary";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  // Straight into the query as a `date` filter, so reject anything that isn't
  // the shape we produce.
  if (!DATE_RE.test(date)) notFound();

  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();

  const [dayLog, workouts] = await Promise.all([
    supabase.from("day_logs").select("walked").eq("date", date).maybeSingle(),
    supabase
      .from("workouts")
      .select(WORKOUT_SUMMARY_SELECT)
      .eq("date", date)
      .order("started_at", { ascending: false }),
  ]);

  return (
    <DayDetail
      userId={userId}
      date={date}
      serverToday={toDateString(new Date())}
      initialWalked={dayLog.data?.walked ?? false}
      workouts={((workouts.data ?? []) as WorkoutRow[]).map(summarize)}
    />
  );
}
