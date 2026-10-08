/* eslint-disable @next/next/no-img-element */
import { CAPTION_BUCKET, DAILY_UPLOAD_LIMIT, countRecentUploads, getMyUploads } from "@/lib/captions";
import { requireCompleteProfile } from "@/lib/profile";
import CreateForm from "./CreateForm";

export const metadata = { title: "Create · Captions" };

// The AI call runs in a Server Action on this page and can take several seconds.
export const maxDuration = 60;

function Score({ up, down }: { up: number; down: number }) {
  const score = up - down;
  const tone = score > 0 ? "bg-up text-white" : score < 0 ? "bg-down text-white" : "bg-black/10 text-foreground dark:bg-white/15";
  return (
    <span
      title={`${up} up, ${down} down`}
      className={`inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums ${tone}`}
    >
      {score > 0 ? `+${score}` : score}
    </span>
  );
}

export default async function CreatePage() {
  const { user } = await requireCompleteProfile();
  const [used, uploads] = await Promise.all([countRecentUploads(user.id), getMyUploads(user.id)]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Post a photo</h1>
      <p className="mb-6 text-neutral-600 dark:text-neutral-400">
        The AI writes three captions for it. Everyone votes on which ones are actually funny.
      </p>

      <CreateForm
        userId={user.id}
        bucket={CAPTION_BUCKET}
        uploadsLeft={Math.max(DAILY_UPLOAD_LIMIT - used, 0)}
        dailyLimit={DAILY_UPLOAD_LIMIT}
      />

      {uploads.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-1 text-xl font-bold tracking-tight">Your photos</h2>
          <p className="mb-4 text-sm text-neutral-500">How your captions are scoring so far.</p>
          <ul className="space-y-4">
            {uploads.map((upload) => (
              <li key={upload.id} className="flex gap-4 rounded-2xl border border-black/10 p-3 dark:border-white/10">
                <img src={upload.url} alt="" className="h-24 w-24 shrink-0 rounded-lg bg-neutral-900 object-cover" />
                <ul className="min-w-0 flex-1 space-y-2 self-center">
                  {upload.captions.map((c) => (
                    <li key={c.id} className="flex items-start gap-3 text-sm leading-snug">
                      <Score up={c.upvotes} down={c.downvotes} />
                      <span className="pt-1">{c.content}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
