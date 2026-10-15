"use client";

import { useState, useTransition } from "react";
import { deletePost } from "./actions";

/** Delete with an inline "are you sure" step instead of a browser pop-up. */
export default function DeleteButton({ imageId, votes }: { imageId: string; votes: number }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs font-semibold text-down hover:underline">
        Delete
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center justify-end gap-2 text-xs">
      <span className="text-neutral-600 dark:text-neutral-400">
        {votes > 0 ? `Delete this photo and its ${votes} ${votes === 1 ? "vote" : "votes"}?` : "Delete this photo?"}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await deletePost(imageId);
            if (!result.ok) setError(result.error);
          })
        }
        className="rounded-full bg-down px-3 py-1 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="rounded-full border border-black/15 px-3 py-1 font-medium dark:border-white/20">
        Cancel
      </button>
      {error && <span className="w-full text-right text-red-600">{error}</span>}
    </span>
  );
}
