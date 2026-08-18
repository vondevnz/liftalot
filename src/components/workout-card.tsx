import Link from "next/link";
import { formatShortDate } from "@/lib/date";
import { describeExercises, type WorkoutSummary } from "@/lib/workout-summary";

export function WorkoutCard({ workout }: { workout: WorkoutSummary }) {
  return (
    <Link
      href={`/workout/${workout.id}`}
      className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-surface-1 px-4 py-3"
    >
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-medium">{workout.name}</span>
          {/* The date rides alongside as a label rather than heading the card. */}
          <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-muted">
            {formatShortDate(workout.date)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm text-fg-muted">
          {describeExercises(workout.exerciseNames)}
        </span>
      </span>
      <span className="shrink-0 text-sm tabular-nums text-fg-dim">
        {workout.setCount} {workout.setCount === 1 ? "set" : "sets"}
      </span>
    </Link>
  );
}
