import Link from "next/link";
import SignInButton from "@/components/SignInButton";
import { getSession } from "@/lib/profile";

export default async function Home() {
  const { user, profile } = await getSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
      <p className="mb-3 text-sm uppercase tracking-widest text-neutral-500">COMS6998 · Caption Rating App</p>
      <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
        {user ? `Welcome back${profile?.first_name ? `, ${profile.first_name}` : ""}.` : "Captions, members only."}
      </h1>
      <p className="mb-8 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
        {user
          ? "You're signed in. Head to the feed or update your profile."
          : "Sign in with Google to see the caption feed and set up your profile."}
      </p>
      {user ? (
        <div className="flex gap-3">
          <Link href="/captions" className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            Go to feed
          </Link>
          <Link href="/profile" className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium dark:border-white/20">
            Profile
          </Link>
        </div>
      ) : (
        <div>
          <SignInButton />
        </div>
      )}
    </main>
  );
}
