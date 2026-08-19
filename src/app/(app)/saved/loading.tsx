export default function Loading() {
  return (
    <main className="animate-pulse px-4 pt-6" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-44 rounded bg-surface-2" />
      <div className="mb-5 mt-2 h-4 w-56 rounded bg-surface-2" />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-surface-1" />
        ))}
      </div>
    </main>
  );
}
