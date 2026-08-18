"use client";

import { useEffect } from "react";

/**
 * The overlay-and-panel shell shared by the exercise and saved-workout
 * pickers. Extracted when the second one appeared rather than copying the
 * escape handling and safe-area padding a second time.
 */
export function BottomSheet({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label={`Close ${label.toLowerCase()}`}
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative mx-auto flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-3xl border-t border-line bg-surface-1 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto mb-1 mt-3 h-1 w-9 shrink-0 rounded-full bg-line" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
