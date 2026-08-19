export default function Loading() {
  return (
    <main className="animate-pulse px-4 pt-6" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="mb-5 h-8 w-32 rounded bg-surface-2" />
      <div className="space-y-3">
        <div className="h-40 rounded-2xl bg-surface-1" />
        <div className="h-32 rounded-2xl bg-surface-1" />
        <div className="h-32 rounded-2xl bg-surface-1" />
      </div>
    </main>
  );
}
