export default function Loading() {
  return (
    <main className="animate-pulse px-4 pt-6" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="h-4 w-20 rounded bg-surface-2" />
      <div className="mt-2 h-8 w-52 rounded bg-surface-2" />
      <div className="mb-5 mt-2 h-4 w-32 rounded bg-surface-2" />
      <div className="mb-3 flex gap-3">
        <div className="h-24 flex-1 rounded-2xl bg-surface-1" />
        <div className="h-24 flex-1 rounded-2xl bg-surface-1" />
      </div>
      <div className="h-64 rounded-2xl bg-surface-1" />
    </main>
  );
}
