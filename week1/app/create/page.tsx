import Link from "next/link";
import { CAPTION_BUCKET, DAILY_UPLOAD_LIMIT, getDailyUsage } from "@/lib/captions";
import { requireCompleteProfile } from "@/lib/profile";
import CreateForm from "./CreateForm";

export const metadata = { title: "Create · Captions" };

// The AI call runs in a Server Action on this page and can take several seconds.
export const maxDuration = 60;

export default async function CreatePage() {
  const { user } = await requireCompleteProfile();
  const usage = await getDailyUsage(user.id);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Post a photo</h1>
      <p className="mb-6 text-neutral-600 dark:text-neutral-400">
        The AI writes three captions for it in the style you pick. Everyone votes on which ones are actually funny.{" "}
        <Link href="/mine" className="underline underline-offset-2">
          See your photos
        </Link>
      </p>

      <CreateForm userId={user.id} bucket={CAPTION_BUCKET} used={usage.used} nextFreeAt={usage.nextFreeAt} dailyLimit={DAILY_UPLOAD_LIMIT} />
    </main>
  );
}
