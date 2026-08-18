const cardClass = "flex-1 rounded-2xl bg-surface-1 p-4";

export function StreakStats({
  current,
  longest,
}: {
  current: number;
  longest: number;
}) {
  return (
    <div className="flex gap-3">
      <section className={cardClass}>
        <h2 className="text-sm text-fg-muted">Current streak</h2>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tabular-nums text-accent">
            {current}
          </span>
          <span className="text-sm text-fg-muted">
            {current === 1 ? "day" : "days"}
          </span>
        </p>
      </section>
      <section className={cardClass}>
        <h2 className="text-sm text-fg-muted">Longest</h2>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tabular-nums">{longest}</span>
          <span className="text-sm text-fg-muted">
            {longest === 1 ? "day" : "days"}
          </span>
        </p>
      </section>
    </div>
  );
}
