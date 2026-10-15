/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import ScoreLabel from "@/components/ScoreLabel";
import { getActivity, getMyUploads, getTopRanks } from "@/lib/captions";
import { requireCompleteProfile } from "@/lib/profile";
import DeleteButton from "./DeleteButton";
import MarkSeen from "./MarkSeen";

export const metadata = { title: "Mine · Captions" };

function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function Trophy() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3Zm0 4H6v1a2 2 0 0 0 1 1.7V7Zm10 0v2.7A2 2 0 0 0 18 8V7h-1Z" />
    </svg>
  );
}

function RankBadge({ rank }: { rank?: { day?: number; all?: number } }) {
  if (!rank?.day && !rank?.all) return null;
  const text = rank.day ? `#${rank.day} on Top today` : `#${rank.all} on Top all time`;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
      <Trophy />
      {text}
    </span>
  );
}

export default async function MinePage() {
  const { user } = await requireCompleteProfile();
  const [uploads, activity] = await Promise.all([getMyUploads(user.id), getActivity()]);
  const ranks = await getTopRanks(uploads.flatMap((u) => u.captions.map((c) => c.id)));

  const newVotes = activity.reduce((n, a) => n + a.new_up + a.new_down, 0);
  const ranked = uploads
    .flatMap((u) => u.captions.map((c) => ({ ...c, image: u.url, rank: ranks.get(c.id) })))
    .filter((c) => c.rank)
    .sort((a, b) => (a.rank!.day ?? 99) - (b.rank!.day ?? 99) || (a.rank!.all ?? 99) - (b.rank!.all ?? 99));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <MarkSeen hadNew={activity.length > 0} />
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Mine</h1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">How your captions are doing. A yellow dot on this tab means there&apos;s something new.</p>

      {ranked.length > 0 && (
        <section className="mb-8">
          <ul className="space-y-2">
            {ranked.slice(0, 3).map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-400/10">
                <img src={c.image} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-neutral-900 object-cover" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {c.rank!.day ? `#${c.rank!.day} on Top today` : `#${c.rank!.all} on Top all time`}
                  </p>
                  <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">&ldquo;{c.content}&rdquo;</p>
                </div>
                <Link href={c.rank!.day ? "/top" : "/top?range=all"} className="ml-auto shrink-0 text-sm font-semibold underline underline-offset-2">
                  See it
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-xl font-bold tracking-tight">Since you were last here</h2>
        {activity.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">
            {uploads.length ? "No new votes yet. Captions pick up votes as people work through the feed." : "Post a photo and new votes on its captions will show up here."}
          </p>
        ) : (
          <>
            <p className="mb-3 mt-1 text-sm text-neutral-500">
              {newVotes} new {newVotes === 1 ? "vote" : "votes"} on your captions.
            </p>
            <ul className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
              {activity.map((a) => (
                <li key={a.caption_id} className="flex gap-3 py-3">
                  <img src={a.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-neutral-900 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {a.new_up > 0 && <span className="text-up">+{a.new_up} funny</span>}
                      {a.new_up > 0 && a.new_down > 0 && ", "}
                      {a.new_down > 0 && <span className="text-down">{a.new_down} not funny</span>}
                      <span className="font-normal text-neutral-500"> · {ago(a.latest)}</span>
                    </p>
                    <p className="mt-0.5 text-sm leading-snug">{a.content}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ScoreLabel up={a.upvotes} down={a.downvotes} />
                      <RankBadge rank={ranks.get(a.caption_id)} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-bold tracking-tight">Your photos</h2>
          <Link href="/create" className="text-sm font-semibold underline underline-offset-2">
            Post a photo
          </Link>
        </div>
        {uploads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/20 p-6 text-sm text-neutral-600 dark:border-white/20 dark:text-neutral-400">
            You haven&apos;t posted a photo yet.
          </div>
        ) : (
          <ul className="space-y-4">
            {uploads.map((upload) => {
              const votes = upload.captions.reduce((n, c) => n + c.upvotes + c.downvotes, 0);
              return (
                <li key={upload.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
                  <div className="flex gap-4">
                    <img src={upload.url} alt="" className="h-24 w-24 shrink-0 rounded-lg bg-neutral-900 object-cover" />
                    <ul className="min-w-0 flex-1 space-y-3 self-center">
                      {upload.captions.map((c) => (
                        <li key={c.id}>
                          <p className="text-sm leading-snug">{c.content}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <ScoreLabel up={c.upvotes} down={c.downvotes} />
                            <RankBadge rank={ranks.get(c.id)} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-black/5 pt-2 dark:border-white/10">
                    <span className="shrink-0 text-xs whitespace-nowrap text-neutral-500">Posted {ago(upload.created_at)}</span>
                    <DeleteButton imageId={upload.id} votes={votes} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
