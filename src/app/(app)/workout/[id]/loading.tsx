/**
 * Without this, tapping + left the previous screen on display for the whole
 * round trip with no indication anything was happening — which is most of why
 * it read as slow rather than merely networked.
 *
 * The shape matches the real screen so the swap isn't a jolt.
 */
export default function Loading() {
  return (
    <main className="px-4 pt-6" aria-busy="true">
      <span className="sr-only">Loading workout…</span>
      <header className="mb-5 animate-pulse">
        <div className="h-4 w-24 rounded bg-surface-2" />
        <div className="mt-2 h-8 w-36 rounded bg-surface-2" />
        <div className="mt-2 h-4 w-20 rounded bg-surface-2" />
      </header>
      <div className="animate-pulse space-y-3">
        <div className="h-32 rounded-2xl bg-surface-1" />
        <div className="h-14 rounded-2xl border border-dashed border-line" />
      </div>
    </main>
  );
}
