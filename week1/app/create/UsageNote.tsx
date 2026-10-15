import LocalTime from "@/components/LocalTime";

/** "8 of 10 photos left today", why there's a limit, and when the next photo frees up. */
export default function UsageNote({ used, limit, nextFreeAt }: { used: number; limit: number; nextFreeAt: string | null }) {
  const left = Math.max(limit - used, 0);
  return (
    <p className="mt-3 text-sm leading-relaxed text-neutral-500">
      <span className="font-semibold text-neutral-700 dark:text-neutral-300">
        {left > 0 ? `${left} of ${limit} photos left today.` : `You've used all ${limit} photos for now.`}
      </span>{" "}
      Each photo costs an AI call, so the cap keeps the app free and the feed from flooding. Photos you discard or delete
      still count.
      {nextFreeAt && (
        <>
          {" "}
          Each one counts for 24 hours, so you get one back at <LocalTime iso={nextFreeAt} />.
        </>
      )}
    </p>
  );
}
