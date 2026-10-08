"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { generateCaptions } from "./actions";

type Props = { userId: string; bucket: string; uploadsLeft: number; dailyLimit: number };
type Stage =
  | { name: "idle" }
  | { name: "chosen"; blob: Blob; preview: string }
  | { name: "working"; preview: string; step: "Uploading your photo…" | "Writing captions…" }
  | { name: "done"; preview: string; captions: { id: number; content: string }[] };

const MAX_EDGE = 1600; // px. Phone photos are far bigger than the feed or the AI needs.

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

export default function CreateForm({ userId, bucket, uploadsLeft, dailyLimit }: Props) {
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [left, setLeft] = useState(uploadsLeft);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still fires
    if (!file) return;
    setError(null);
    try {
      const blob = await prepare(file);
      setStage({ name: "chosen", blob, preview: URL.createObjectURL(blob) });
    } catch {
      setError("Couldn't open that file. Use a JPG, PNG, or WebP photo.");
    }
  }

  async function submit() {
    if (stage.name !== "chosen") return;
    const { blob, preview } = stage;
    setError(null);
    setStage({ name: "working", preview, step: "Uploading your photo…" });

    // 1. The photo goes straight from the browser to Supabase Storage, into this user's own folder.
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setStage({ name: "chosen", blob, preview });
      return;
    }

    // 2. The server sends it to the AI and saves the captions.
    setStage({ name: "working", preview, step: "Writing captions…" });
    let result: Awaited<ReturnType<typeof generateCaptions>>;
    try {
      result = await generateCaptions(path);
    } catch {
      result = { ok: false, error: "Something went wrong while writing captions. Try again." };
    }
    if (!result.ok) {
      setError(result.error);
      setStage({ name: "chosen", blob, preview });
      return;
    }
    setLeft(result.uploadsLeft);
    setStage({ name: "done", preview, captions: result.captions });
  }

  const picker = <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />;
  const choose = () => fileRef.current?.click();
  const primary = "rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900";
  const secondary = "rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-white/20";

  if (stage.name === "idle") {
    return (
      <div>
        {picker}
        <button
          type="button"
          onClick={choose}
          disabled={left <= 0}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-black/25 px-6 py-14 text-center transition-colors enabled:hover:border-black/60 enabled:hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/25 dark:enabled:hover:border-white/60 dark:enabled:hover:bg-white/[0.04]"
        >
          <span className="text-lg font-semibold">Choose a photo</span>
          <span className="text-sm text-neutral-500">JPG, PNG, or WebP</span>
        </button>
        <p className="mt-3 text-sm text-neutral-500">
          {left > 0
            ? `${left} of ${dailyLimit} photos left today. Everyone who is signed in will see your photo.`
            : `You've posted ${dailyLimit} photos in the last 24 hours. Come back tomorrow for more.`}
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

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
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={submit} className={primary}>
              Write captions for this photo
            </button>
            <button type="button" onClick={choose} className={secondary}>
              Choose a different photo
            </button>
          </div>
          <p className="mt-3 text-sm text-neutral-500">
            Posting shows this photo to everyone who is signed in. It can&apos;t be edited afterwards.
          </p>
        </>
      )}

      {stage.name === "working" && <p className="mt-4 text-sm text-neutral-500">This takes about ten seconds.</p>}

      {stage.name === "done" && (
        <>
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            Posted. These {stage.captions.length} captions are now in everyone&apos;s feed, including yours.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/captions" className={primary}>
              Go vote
            </Link>
            <button type="button" onClick={choose} disabled={left <= 0} className={secondary}>
              Post another photo
            </button>
          </div>
          <p className="mt-3 text-sm text-neutral-500">
            {left} of {dailyLimit} photos left today.
          </p>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
