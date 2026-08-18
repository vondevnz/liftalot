import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressChart } from "@/components/progress-chart";
import { createClient } from "@/lib/supabase/server";
import { formatDayLabel, type DateString } from "@/lib/date";
import {
  buildSessions,
  toSeries,
  type FlatSet,
  type Metric,
} from "@/lib/exercise-history";
import { displayWeight, formatWeight, isUnit, type Unit } from "@/lib/units";
import type { Exercise } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Same PostgREST to-one/array widening as the workout summary queries. */
type Embedded = { date: DateString } | { date: DateString }[] | null;

type Row = { weight_kg: number | null; reps: number; workouts: Embedded };

function embeddedDate(w: Embedded): DateString | undefined {
  if (!w) return undefined;
  return Array.isArray(w) ? w[0]?.date : w.date;
}

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [exerciseResult, setsResult, profileResult] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, name, muscle_group, equipment, is_bodyweight")
      .eq("id", id)
      .maybeSingle(),
    // RLS on set_entries checks ownership through the parent workout, so this
    // returns only this user's sets without an explicit user filter.
    supabase
      .from("set_entries")
      .select("weight_kg, reps, workouts!inner(date)")
      .eq("exercise_id", id),
    // RLS restricts profiles to the caller's own row, so no user filter and no
    // extra getUser round trip.
    supabase.from("profiles").select("unit").maybeSingle(),
  ]);

  const exercise = exerciseResult.data as Exercise | null;
  if (!exercise) notFound();

  const unit: Unit = isUnit(profileResult.data?.unit) ? profileResult.data.unit : "kg";

  const flat: FlatSet[] = ((setsResult.data ?? []) as Row[])
    .map((r) => ({
      date: embeddedDate(r.workouts),
      weight_kg: r.weight_kg,
      reps: r.reps,
    }))
    .filter((r): r is FlatSet => r.date !== undefined);

  const sessions = buildSessions(flat);
  // A bodyweight movement has no weight to plot, so the chart tracks reps.
  const metric: Metric = exercise.is_bodyweight ? "reps" : "weight";
  // Converted before the chart sees them, so the axis ticks are round numbers
  // in the unit on screen rather than round kilograms awkwardly relabelled.
  const points = toSeries(sessions, metric).map((p) => ({
    ...p,
    value: metric === "weight" ? displayWeight(p.value, unit) : p.value,
  }));
  const unitLabel = metric === "weight" ? ` ${unit}` : " reps";

  const best = points.reduce<number | null>(
    (max, p) => (max === null || p.value > max ? p.value : max),
    null,
  );
  const bestDate = points.find((p) => p.value === best)?.date;

  return (
    <main className="px-4 pt-6">
      {/* Progress is the section that owns exercise pages — it is what the nav
          highlights while you are here, so it is where Back belongs. */}
      <Link href="/progress" className="inline-flex min-h-11 items-center text-sm text-fg-muted">
        ← Progress
      </Link>

      <h1 className="font-brand mt-1 text-2xl font-semibold tracking-tight">{exercise.name}</h1>
      <p className="mb-5 text-sm text-fg-muted">
        {exercise.muscle_group} · {exercise.equipment}
      </p>

      {points.length === 0 ? (
        <p className="rounded-2xl bg-surface-1 px-4 py-8 text-center text-sm text-fg-muted">
          No sessions logged yet. Log a set and your progress shows up here.
        </p>
      ) : (
        <>
          <div className="mb-3 flex gap-3">
            <section className="flex-1 rounded-2xl bg-surface-1 p-4">
              <h2 className="text-sm text-fg-muted">
                {metric === "weight" ? "Heaviest" : "Most reps"}
              </h2>
              <p className="mt-1 flex items-baseline gap-1.5">
                {/* `best` is already in display units — points were converted. */}
                <span className="text-3xl font-semibold tabular-nums">{best}</span>
                <span className="text-sm text-fg-muted">
                  {metric === "weight" ? unit : "reps"}
                </span>
              </p>
              {bestDate && (
                <p className="mt-0.5 text-xs text-fg-dim">{formatDayLabel(bestDate)}</p>
              )}
            </section>
            <section className="flex-1 rounded-2xl bg-surface-1 p-4">
              <h2 className="text-sm text-fg-muted">Sessions</h2>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{sessions.length}</p>
              <p className="mt-0.5 text-xs text-fg-dim">
                {sessions.reduce((n, s) => n + s.sets, 0)} sets total
              </p>
            </section>
          </div>

          <section className="rounded-2xl bg-surface-1 p-4">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              {/* Single series, so no legend — the heading names it. */}
              <h2 className="text-[15px] font-medium">
                {metric === "weight" ? "Top weight" : "Top reps"} per session
              </h2>
              <span className="text-xs text-fg-dim">Calendar time</span>
            </div>

            <ProgressChart points={points} metric={metric} unitLabel={unitLabel} />

            {/* The tooltip enhances; it never gates. Every value is here too. */}
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-fg-muted">
                View as table
              </summary>
              <div className="mt-2 max-h-64 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface-1 text-xs text-fg-dim">
                    <tr>
                      <th scope="col" className="py-1.5 font-medium">Date</th>
                      <th scope="col" className="py-1.5 text-right font-medium">
                        {metric === "weight" ? "Top weight" : "Top reps"}
                      </th>
                      <th scope="col" className="py-1.5 text-right font-medium">Sets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sessions].reverse().map((s) => (
                      <tr key={s.date} className="border-t border-line/60">
                        <td className="py-1.5">{formatDayLabel(s.date)}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {metric === "weight"
                            ? (formatWeight(s.topWeight, unit) ?? "—")
                            : s.topReps}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{s.sets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        </>
      )}
    </main>
  );
}
