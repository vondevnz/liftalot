/**
 * Shown while the server renders. Without it the previous screen simply sits
 * there for the length of the round trip, which reads as a freeze rather than
 * as loading — the single biggest contributor to the app "feeling slow".
 */
export default function Loading() {
  return (
    <main className="animate-pulse px-4 pt-6" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="mb-5 h-8 w-40 rounded bg-surface-2" />
      <div className="space-y-3">
        <div className="h-16 rounded-2xl bg-surface-1" />
        <div className="flex gap-3">
          <div className="h-24 flex-1 rounded-2xl bg-surface-1" />
          <div className="h-24 flex-1 rounded-2xl bg-surface-1" />
        </div>
        <div className="h-56 rounded-2xl bg-surface-1" />
        <div className="h-64 rounded-2xl bg-surface-1" />
      </div>
    </main>
  );
}
