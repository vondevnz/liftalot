"use client";

import { useState } from "react";
import { BottomSheet } from "./bottom-sheet";

export function SaveTemplateDialog({
  defaultName,
  exerciseCount,
  onSave,
  onClose,
}: {
  defaultName: string;
  exerciseCount: number;
  /** Resolves to an error message, or null on success. */
  onSave: (name: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() === "" || saving) return;
    setSaving(true);
    setError(null);
    const message = await onSave(name.trim());
    if (message) {
      setError(message);
      setSaving(false);
    }
  }

  return (
    <BottomSheet label="Save as workout" onClose={onClose}>
      <form onSubmit={submit} className="px-4 pb-4 pt-2">
        <h2 className="font-medium">Save as workout</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Saves {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"} with
          their sets and weights, to load again later.
        </p>

        <label htmlFor="template-name" className="sr-only">
          Name
        </label>
        <input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="Monday"
          className="mt-4 h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base outline-none placeholder:text-fg-dim focus:border-accent"
        />

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-xl border border-line font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || name.trim() === ""}
            className="h-12 flex-1 rounded-xl bg-accent font-semibold text-black disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
