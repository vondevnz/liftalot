export default function Loading() {
  return (
    <main className="px-4 pt-6" aria-busy="true">
      <span className="sr-only">Loading day…</span>
      <div className="animate-pulse">
        <div className="h-4 w-16 rounded bg-surface-2" />
        <div className="mb-5 mt-2 h-8 w-56 rounded bg-surface-2" />
        <div className="space-y-3">
          <div className="h-16 rounded-2xl bg-surface-1" />
          <div className="h-24 rounded-2xl bg-surface-1" />
        </div>
      </div>
    </main>
  );
}
