import { getSupabase, requireCompleteProfile } from "@/lib/profile";

// Gated route: proxy.ts redirects logged-out visitors; this check is the second line of defense.
export default async function CaptionsPage() {
  const { profile } = await requireCompleteProfile();
  const supabase = await getSupabase();

  const { data: captions, error } = await supabase.from("captions").select().order("id");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="mb-1 text-sm text-neutral-500">
        Signed in as {profile.first_name} {profile.last_name}
      </p>
      <h1 className="mb-6 text-3xl font-bold">Captions</h1>
      {error ? (
        <p className="text-red-600">Error: {error.message}</p>
      ) : (
        <ul className="space-y-4">
          {captions?.map((c) => (
            <li key={c.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
              {c.content}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
