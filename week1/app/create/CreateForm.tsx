"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { STYLES, type Style } from "@/lib/styles";
import { createClient } from "@/utils/supabase/client";
import { discardDraft, draftCaptions, publishPost, type Draft } from "./actions";
import UsageNote from "./UsageNote";

type Props = { userId: string; bucket: string; used: number; nextFreeAt: string | null; dailyLimit: number };
type Stage =
  | { name: "idle" }
  | { name: "chosen"; blob: Blob; preview: string; path?: string }
  | { name: "working"; preview: string; step: string }
  | { name: "review"; preview: string; draft: Draft; keep: boolean[]; posting: boolean }
  | { name: "done"; preview: string; captions: { id: number; content: string }[] };

const MAX_EDGE = 1600; // px. Phone photos are far bigger than the feed or the AI needs.
const MAX_REDOS = 3; // "New captions" presses per photo (also enforced in the database)
const STYLE_KEYS = Object.keys(STYLES) as Style[];

/** Shrink the photo in the browser and re-encode it as a JPG before it is uploaded. */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );
}

async function askAI(path: string, style: Style): Promise<Awaited<ReturnType<typeof draftCaptions>>> {
  try {
    return await draftCaptions(path, style);
  } catch {
    return { ok: false, error: "Something went wrong while writing captions. Try again." };
  }
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
        on ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border-2 border-black/25 dark:border-white/30"
      }`}
    >
      {on && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  );
}

function StylePicker({ value, onChange, disabled }: { value: Style; onChange: (s: Style) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Caption style" className="flex flex-wrap gap-2">
      {STYLE_KEYS.map((key) => {
        const on = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              on
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                : "border-black/15 hover:border-black/40 dark:border-white/20 dark:hover:border-white/50"
            }`}
          >
            {STYLES[key].label}
          </button>
        );
      })}
    </div>
  );
}

export default function CreateForm({ userId, bucket, used: initialUsed, nextFreeAt: initialNextFree, dailyLimit }: Props) {
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [usage, setUsage] = useState({ used: initialUsed, nextFreeAt: initialNextFree });
  const [style, setStyle] = useState<Style>("mixed");
  const [redos, setRedos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const left = Math.max(dailyLimit - usage.used, 0);

  // Warn before leaving the page with a draft that hasn't been posted.
  const unsaved = stage.name === "review";
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  /** Upload the photo (unless it already is), then have the AI write a draft. Nothing is posted. */
  async function write(blob: Blob, preview: string, existingPath?: string) {
    setError(null);
    let path = existingPath;
    if (!path) {
      setStage({ name: "working", preview, step: "Uploading your photo…" });
      path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await createClient()
        .storage.from(bucket)
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setStage({ name: "chosen", blob, preview });
        return;
      }
    }
    setStage({ name: "working", preview, step: `Writing ${style === "mixed" ? "" : `${STYLES[style].label.toLowerCase()} `}captions…` });
    const result = await askAI(path, style);
    if (!result.ok) {
      setError(result.error);
      setStage({ name: "chosen", blob, preview, path });
      return;
    }
    setUsage({ used: result.used, nextFreeAt: result.nextFreeAt });
    setRedos(0);
    setStage({ name: "review", preview, draft: result.draft, keep: result.draft.captions.map(() => true), posting: false });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still fires
    if (!file) return;
    setError(null);
    let blob: Blob;
    try {
      blob = await prepare(file);
    } catch {
      setError("Couldn't open that file. Use a JPG, PNG, or WebP photo.");
      return;
    }
    // Replacing an unposted draft ("Wrong photo"): throw the old file away.
    if (stage.name === "review") discardDraft(stage.draft.path).catch(() => {});
    // Choosing a photo goes straight to the AI. The review screen is where you confirm it.
    write(blob, URL.createObjectURL(blob));
  }

  async function redo() {
    if (stage.name !== "review" || redos >= MAX_REDOS) return;
    const before = stage;
    setError(null);
    setStage({ name: "working", preview: before.preview, step: `Writing new ${style === "mixed" ? "" : `${STYLES[style].label.toLowerCase()} `}captions…` });
    const result = await askAI(before.draft.path, style);
    if (!result.ok) {
      setError(result.error);
      setStage(before);
      return;
    }
    setRedos((n) => n + 1);
    setStage({ ...before, draft: result.draft, keep: result.draft.captions.map(() => true) });
  }

  function toggle(i: number) {
    if (stage.name !== "review" || stage.posting) return;
    setStage({ ...stage, keep: stage.keep.map((k, j) => (j === i ? !k : k)) });
  }

  async function post() {
    if (stage.name !== "review") return;
    const keep = stage.keep.flatMap((k, i) => (k ? [i] : []));
    if (!keep.length) return;
    setError(null);
    setStage({ ...stage, posting: true });
    let result: Awaited<ReturnType<typeof publishPost>>;
    try {
      result = await publishPost(stage.draft, keep);
    } catch {
      result = { ok: false, error: "Couldn't post. Check your connection and try again." };
    }
    if (!result.ok) {
      setError(result.error);
      setStage({ ...stage, posting: false });
      return;
    }
    setStage({ name: "done", preview: stage.preview, captions: result.captions });
  }

  const picker = <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />;
  const choose = () => fileRef.current?.click();
  const primary = "rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900";
  const go = "rounded-full bg-up px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
  const secondary = "rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-white/20";
  const errorLine = error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>;
  const usageNote = <UsageNote used={usage.used} limit={dailyLimit} nextFreeAt={usage.nextFreeAt} />;
  const styleLabel = style === "mixed" ? "" : `${STYLES[style].label.toLowerCase()} `;

  if (stage.name === "idle") {
    return (
      <div>
        {picker}
        <p className="mb-2 text-sm font-semibold">Caption style</p>
        <StylePicker value={style} onChange={setStyle} />
        <button
          type="button"
          onClick={choose}
          disabled={left <= 0}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-black/25 px-6 py-14 text-center transition-colors enabled:hover:border-black/60 enabled:hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/25 dark:enabled:hover:border-white/60 dark:enabled:hover:bg-white/[0.04]"
        >
          <span className="text-lg font-semibold">Choose a photo</span>
          <span className="text-sm text-neutral-500">JPG, PNG, or WebP. You&apos;ll check it before anything is posted.</span>
        </button>
        {usageNote}
        {errorLine}
      </div>
    );
  }

  if (stage.name === "review") {
    const kept = stage.keep.filter(Boolean).length;
    const redosLeft = MAX_REDOS - redos;
    const draftStyle = STYLES[stage.draft.style].label;
    return (
      <div>
        {picker}
        <span className="mb-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold tracking-wide text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
          NOT POSTED YET
        </span>
        <h2 className="text-2xl font-bold tracking-tight">Is this the right photo?</h2>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">Uncheck any caption you don&apos;t want posted.</p>

        <div className="overflow-hidden rounded-2xl border border-black/15 dark:border-white/15">
          <div className="relative bg-neutral-900">
            <img src={stage.preview} alt="The photo you chose" className="mx-auto max-h-[22rem] w-auto object-contain" />
            <button
              type="button"
              onClick={choose}
              disabled={stage.posting}
              className="absolute right-3 bottom-3 rounded-full bg-white/95 px-3.5 py-1.5 text-sm font-semibold text-neutral-900 shadow-md hover:bg-white disabled:opacity-50"
            >
              Wrong photo? Swap it
            </button>
          </div>
          <p className="border-b border-black/10 px-4 pt-3 pb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:border-white/10">
            {draftStyle} captions
          </p>
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {stage.draft.captions.map((caption, i) => {
              const on = stage.keep[i];
              return (
                <li key={`${stage.draft.token}-${i}`}>
                  <label className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${stage.posting ? "pointer-events-none" : ""}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(i)} className="peer sr-only" />
                    <span className="rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground">
                      <Check on={on} />
                    </span>
                    <span className={`text-base font-semibold leading-snug tracking-tight ${on ? "" : "text-neutral-400 line-through"}`}>{caption}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <button type="button" onClick={post} disabled={!kept || stage.posting} className={`${go} mt-4 w-full sm:w-auto`}>
          {stage.posting ? "Posting…" : kept ? `Post ${kept === 1 ? "1 caption" : `${kept} captions`}` : "Keep at least one"}
        </button>

        <div className="mt-6 rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="mb-2 text-sm font-semibold">Not feeling these? Try a different style</p>
          <StylePicker value={style} onChange={setStyle} disabled={stage.posting || redosLeft <= 0} />
          <button type="button" onClick={redo} disabled={stage.posting || redosLeft <= 0} className={`${secondary} mt-3 w-full sm:w-auto`}>
            New {styleLabel}captions
          </button>
          <p className="mt-2.5 text-xs text-neutral-500">
            {redosLeft > 0
              ? `${redosLeft === 1 ? "1 more new set" : `${redosLeft} more new sets`} for this photo. Doesn't use up a daily photo.`
              : "That's the last new set for this photo."}{" "}
            Nothing is saved until you post.
          </p>
        </div>
        {errorLine}
      </div>
    );
  }

  // chosen (after an error), working, done
  return (
    <div>
      {picker}
      <div className="overflow-hidden rounded-2xl border border-black/15 dark:border-white/15">
        <div className="relative bg-neutral-900">
          <img src={stage.preview} alt="Your photo" className={`mx-auto max-h-[26rem] w-auto object-contain ${stage.name === "working" ? "opacity-50" : ""}`} />
          {stage.name === "working" && (
            <p role="status" className="absolute inset-0 flex items-center justify-center text-base font-semibold text-white">
              <span className="rounded-full bg-black/70 px-4 py-2">{stage.step}</span>
            </p>
          )}
        </div>

        {stage.name === "done" && (
          <ol className="divide-y divide-black/10 dark:divide-white/10">
            {stage.captions.map((c) => (
              <li key={c.id} className="px-5 py-3.5 text-lg font-semibold leading-snug tracking-tight">
                {c.content}
              </li>
            ))}
          </ol>
        )}
      </div>

      {stage.name === "chosen" && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => write(stage.blob, stage.preview, stage.path)} className={primary}>
            Try again
          </button>
          <button type="button" onClick={choose} className={secondary}>
            Choose a different photo
          </button>
        </div>
      )}

      {stage.name === "working" && <p className="mt-4 text-sm text-neutral-500">This takes about ten seconds. Nothing is posted yet.</p>}

      {stage.name === "done" && (
        <>
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            Posted. {stage.captions.length === 1 ? "This caption is" : `These ${stage.captions.length} captions are`} now in everyone&apos;s
            feed. You&apos;ll see new votes on the Mine tab.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/mine" className={primary}>
              See your photos
            </Link>
            <button type="button" onClick={choose} disabled={left <= 0} className={secondary}>
              Post another photo
            </button>
          </div>
          {usageNote}
        </>
      )}

      {errorLine}
    </div>
  );
}
