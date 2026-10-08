import Link from "next/link";
import SignInButton from "@/components/SignInButton";
import { getSession } from "@/lib/profile";

const STEPS = [
  { title: "Post a photo", body: "Your dorm room, your bodega order, the thing you saw on the 1 train." },
  { title: "The AI writes three captions", body: "Each one takes a different angle on what's in the picture." },
  { title: "Everyone votes", body: "One caption at a time. You see the score only after you've picked." },
];

export default async function Home() {
  const { user, profile } = await getSession();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-14">
      <h1 className="mb-5 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl">
        {user ? `Welcome back${profile?.first_name ? `, ${profile.first_name}` : ""}.` : "AI wrote the caption. You decide if it's funny."}
      </h1>
      <p className="mb-8 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
        {user
          ? "Vote on the latest captions, or post a photo and see what the AI makes of it."
          : "Post a photo from your week in New York, get three AI-written captions, and vote on everyone else's."}
      </p>

      {user ? (
        <div className="flex flex-wrap gap-3">
          <Link href="/captions" className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            Start voting
          </Link>
          <Link href="/create" className="rounded-full border border-black/15 px-6 py-3 text-sm font-medium dark:border-white/20">
            Post a photo
          </Link>
          <Link href="/top" className="rounded-full border border-black/15 px-6 py-3 text-sm font-medium dark:border-white/20">
            See today&apos;s top
          </Link>
        </div>
      ) : (
        <div>
          <SignInButton />
        </div>
      )}

      <ol className="mt-16 grid gap-8 border-t border-black/10 pt-8 sm:grid-cols-3 dark:border-white/10">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sign text-sm font-bold text-white dark:bg-white dark:text-black">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
