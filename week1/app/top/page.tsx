import Link from "next/link";
import CaptionPhoto from "@/components/CaptionPhoto";
import ScoreLabel from "@/components/ScoreLabel";
import { RANGES, getTopCaptions, type Range } from "@/lib/captions";
import { requireCompleteProfile } from "@/lib/profile";

export const metadata = { title: "Top · Captions" };

export default async function TopPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireCompleteProfile();
  const { range: raw } = await searchParams;
  const range: Range = raw && raw in RANGES ? (raw as Range) : "day";
  const { captions, error } = await getTopCaptions(range);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Top captions</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Ranked by score: funny votes minus not-funny votes.</p>
        </div>
        <nav aria-label="Time range" className="flex rounded-full border border-black/15 p-1 text-sm dark:border-white/20">
          {(Object.keys(RANGES) as Range[]).map((key) => (
            <Link
              key={key}
              href={key === "day" ? "/top" : `/top?range=${key}`}
              aria-current={key === range ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 font-medium ${
                key === range ? "bg-sign text-white dark:bg-white dark:text-black" : "text-neutral-600 hover:text-foreground dark:text-neutral-400"
              }`}
            >
              {RANGES[key].label}
            </Link>
          ))}
        </nav>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-600/30 bg-red-600/5 p-4 text-sm text-red-700 dark:text-red-400">
          Couldn&apos;t load the top captions: {error}
        </p>
      ) : captions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 p-8 dark:border-white/20">
          <h2 className="mb-2 text-xl font-bold tracking-tight">
            {range === "all" ? "No caption has been upvoted yet." : `Nothing ranked ${range === "day" ? "today" : "this week"} yet.`}
          </h2>
          <p className="mb-5 text-neutral-600 dark:text-neutral-400">A caption shows up here once it has more funny votes than not-funny votes.</p>
          <Link href="/captions" className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            Go vote
          </Link>
        </div>
      ) : (
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {captions.map((c, i) => (
            <li key={c.id} className="flex flex-col overflow-hidden rounded-2xl border border-black/15 bg-sign dark:border-white/15">
              <CaptionPhoto src={c.image_url} className="aspect-[4/5]" />
              <div className="flex flex-1 flex-col bg-sign px-4 pb-4 pt-[7px] text-white">
                <div className="mb-3.5 h-px bg-white/90" />
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold tabular-nums text-black">
                    {i + 1}
                  </span>
                  <p className="min-h-[4.25rem] flex-1 text-lg font-bold leading-snug tracking-tight">{c.content}</p>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-sm text-neutral-400">
                  <ScoreLabel up={c.upvotes} down={c.downvotes} dark />
                  {c.my_vote && <p>You said {c.my_vote === 1 ? "funny" : "not funny"}</p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
