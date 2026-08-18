"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatWeight, type Unit } from "@/lib/units";

const UNITS: { value: Unit; label: string }[] = [
  { value: "kg", label: "Kilograms" },
  { value: "lb", label: "Pounds" },
];

export function UnitSetting({ userId, initial }: { userId: string; initial: Unit }) {
  const router = useRouter();
  const [unit, setUnit] = useState<Unit>(initial);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: Unit) {
    if (next === unit) return;
    const previous = unit;
    setUnit(next);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, unit: next, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );

    if (error) {
      setUnit(previous);
      setError("Couldn't save that. Check your connection.");
      return;
    }
    // Every screen renders weights through this, so re-fetch them.
    router.refresh();
  }

  return (
    <section className="rounded-2xl bg-surface-1 p-4">
      <h2 className="text-[15px] font-medium">Weight units</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Changes how weights are shown and entered. Nothing you have already
        logged is altered — weights are stored once and converted for display.
      </p>

      <div
        role="radiogroup"
        aria-label="Weight units"
        className="mt-3 flex gap-2"
      >
        {UNITS.map((u) => (
          <button
            key={u.value}
            type="button"
            role="radio"
            aria-checked={unit === u.value}
            onClick={() => choose(u.value)}
            className={`min-h-13 flex-1 rounded-xl border text-[15px] font-medium transition-colors ${
              unit === u.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-surface-2 text-fg-muted"
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-fg-dim">
        A 60 kg lift shows as {formatWeight(60, unit)}.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
