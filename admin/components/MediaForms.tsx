"use client";

import { useActionState, useState } from "react";
import { addCaption, deleteCaption, deleteImage, updateCaption, type ActionState } from "@/app/captions/actions";

const initial: ActionState = {};

function Status({ state }: { state: ActionState }) {
  if (state.error) return <p className="mt-1 text-xs text-red-400" role="alert">{state.error}</p>;
  if (state.ok) return <p className="mt-1 text-xs text-up-text" role="status">{state.ok}</p>;
  return null;
}

// Two-step delete: no browser pop-up, but nothing is deleted on a single stray click.
function ConfirmDelete({ label, confirmLabel, pending }: { label: string; confirmLabel: string; pending: boolean }) {
  const [armed, setArmed] = useState(false);
  if (!armed)
    return (
      <button type="button" onClick={() => setArmed(true)} className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-red-400">
        {label}
      </button>
    );
  return (
    <span className="flex items-center gap-1">
      <button type="submit" disabled={pending} className="rounded bg-down px-2 py-1 text-xs font-semibold text-white disabled:opacity-60">
        {pending ? "Deleting…" : confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-white/5">
        Cancel
      </button>
    </span>
  );
}

export function CaptionEditor({ id, content }: { id: number; content: string }) {
  const [saveState, save, saving] = useActionState(updateCaption, initial);
  const [delState, del, deleting] = useActionState(deleteCaption, initial);
  const [text, setText] = useState(content);
  const dirty = text.trim() !== content;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <form action={save} className="flex min-w-0 flex-1 gap-2">
          <input type="hidden" name="id" value={id} />
          <input
            name="content"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            aria-label="Caption text"
            className="min-w-0 flex-1 rounded border border-transparent bg-sign px-2.5 py-1.5 font-semibold text-white outline-none hover:border-white/15 focus:border-white/40"
          />
          {dirty && (
            <button disabled={saving} className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-black disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </form>
        <form action={del}>
          <input type="hidden" name="id" value={id} />
          <ConfirmDelete label="Delete" confirmLabel="Delete caption" pending={deleting} />
        </form>
      </div>
      <Status state={delState.error ? delState : saveState} />
    </div>
  );
}

export function AddCaption({ imageId }: { imageId: string }) {
  const [state, add, adding] = useActionState(addCaption, initial);
  const [text, setText] = useState("");
  return (
    <form
      action={async (fd) => {
        await add(fd);
        setText("");
      }}
      className="mt-2"
    >
      <input type="hidden" name="image_id" value={imageId} />
      <div className="flex gap-2">
        <input
          name="content"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Add a caption to this photo…"
          aria-label="New caption"
          className="min-w-0 flex-1 rounded border border-white/10 bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-neutral-600 focus:border-white/40"
        />
        <button disabled={adding || !text.trim()} className="rounded border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/5 disabled:opacity-40">
          {adding ? "Adding…" : "Add"}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function DeletePhoto({ id }: { id: string }) {
  const [state, del, deleting] = useActionState(deleteImage, initial);
  return (
    <form action={del}>
      <input type="hidden" name="id" value={id} />
      <ConfirmDelete label="Delete photo" confirmLabel="Delete photo + captions" pending={deleting} />
      <Status state={state} />
    </form>
  );
}
