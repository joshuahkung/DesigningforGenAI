import { getUnvotedCaptions } from "@/lib/captions";
import { requireCompleteProfile } from "@/lib/profile";
import VoteDeck from "./VoteDeck";

export const metadata = { title: "Vote · Captions" };

// Gated route: proxy.ts redirects logged-out visitors; this check is the second line of defense,
// and RLS is the third (logged-out requests can't read captions or insert votes at all).
export default async function CaptionsPage() {
  await requireCompleteProfile();
  const { captions, error } = await getUnvotedCaptions();

  return (
    <main className="mx-auto flex h-[calc(100dvh-var(--nav-h))] min-h-[32rem] w-full max-w-md flex-col px-4 pb-3 pt-4">
      {error ? (
        <p className="rounded-lg border border-red-600/30 bg-red-600/5 p-4 text-sm text-red-700 dark:text-red-400">
          Couldn&apos;t load captions: {error}
        </p>
      ) : (
        <VoteDeck initial={captions} />
      )}
    </main>
  );
}
