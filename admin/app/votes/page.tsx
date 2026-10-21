import Link from "next/link";
import Shell, { SectionTitle } from "@/components/Shell";
import { displayName, fmtDateTime, requireAdmin } from "@/lib/admin";
import { loadAll, pct } from "@/lib/data";

export const dynamic = "force-dynamic";

// READ upvotes/downvotes: every vote, newest first, filterable.
export default async function VotesPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { supabase, user } = await requireAdmin();
  const { profiles, captions, votes } = await loadAll(supabase);
  const { v } = await searchParams;
  const filter = v === "up" ? 1 : v === "down" ? -1 : null;

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const capById = new Map(captions.map((c) => [c.id, c]));
  const up = votes.filter((x) => x.value === 1).length;
  const shown = filter ? votes.filter((x) => x.value === filter) : votes;

  const tabs = [
    { key: undefined, label: `All ${votes.length}` },
    { key: "up", label: `Funny ${up}` },
    { key: "down", label: `Not funny ${votes.length - up}` },
  ];

  return (
    <Shell active="/votes" email={user.email ?? ""}>
      <SectionTitle>Votes — {pct(up, votes.length)}% funny</SectionTitle>
      <div className="mb-4 flex gap-2 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/votes?v=${t.key}` : "/votes"}
            className={`rounded-full border px-3 py-1 ${v === t.key ? "border-white bg-white text-black" : "border-white/15 text-neutral-400 hover:text-white"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Voter</th>
              <th className="px-4 py-2.5 font-medium">Caption</th>
              <th className="px-4 py-2.5 font-medium">Caption by</th>
              <th className="px-4 py-2.5 font-medium">Vote</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x) => {
              const c = capById.get(x.caption_id);
              return (
                <tr key={x.id} className="border-t border-white/5">
                  <td className="px-4 py-2.5 whitespace-nowrap text-neutral-400">{fmtDateTime(x.created_at)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{displayName(byId.get(x.user_id))}</td>
                  <td className="max-w-md px-4 py-2.5">{c?.content ?? <span className="text-neutral-500">(deleted)</span>}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-neutral-400">{c ? displayName(byId.get(c.user_id)) : "—"}</td>
                  <td className="px-4 py-2.5">
                    {x.value === 1 ? (
                      <span className="rounded bg-up px-2 py-0.5 text-xs font-semibold text-white">Funny</span>
                    ) : (
                      <span className="rounded bg-down px-2 py-0.5 text-xs font-semibold text-white">Not funny</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No votes here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
