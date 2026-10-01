import { redirect } from "next/navigation";
import SignInButton from "@/components/SignInButton";
import { getSession } from "@/lib/profile";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await getSession();
  if (user) redirect("/captions");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <span className="mb-4 text-3xl" aria-hidden>🔒</span>
      <h1 className="mb-2 text-2xl font-semibold">Sign in to continue</h1>
      <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">
        The caption feed is only visible to signed-in users.
      </p>
      <SignInButton />
      {error && <p className="mt-6 text-sm text-red-600">Sign-in failed ({String(error)}). Try again.</p>}
    </main>
  );
}
