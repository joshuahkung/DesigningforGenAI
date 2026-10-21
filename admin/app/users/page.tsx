/* eslint-disable @next/next/no-img-element */
import Shell, { SectionTitle } from "@/components/Shell";
import { displayName, fmtDate, requireAdmin } from "@/lib/admin";
import { loadAll, pct } from "@/lib/data";

export const dynamic = "force-dynamic";

// READ users/profiles. Read-only on purpose: admin rights are granted only from the database dashboard.
export default async function UsersPage() {
  const { supabase, user } = await requireAdmin();
  const { profiles, images, captions, votes } = await loadAll(supabase);

  const rows = profiles.map((p) => {
    const cast = votes.filter((v) => v.user_id === p.id);
    const mine = captions.filter((c) => c.user_id === p.id);
    return {
      p,
      photos: images.filter((i) => i.user_id === p.id).length,
      captions: mine.length,
      received: mine.reduce((n, c) => n + c.upvotes + c.downvotes, 0),
      cast: cast.length,
      funnyGiven: pct(cast.filter((v) => v.value === 1).length, cast.length),
    };
  });

  return (
    <Shell active="/users" email={user.email ?? ""}>
      <SectionTitle>Users — {profiles.length}</SectionTitle>
      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
              <th className="px-4 py-2.5 text-right font-medium">Photos</th>
              <th className="px-4 py-2.5 text-right font-medium">Captions</th>
              <th className="px-4 py-2.5 text-right font-medium">Votes received</th>
              <th className="px-4 py-2.5 text-right font-medium">Votes cast</th>
              <th className="px-4 py-2.5 text-right font-medium">Says funny</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, ...r }) => (
              <tr key={p.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs">
                        {displayName(p).slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <div className="font-medium">{displayName(p)}</div>
                      <div className="text-xs text-neutral-500">{p.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-400">{fmtDate(p.created_at)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.photos}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.captions}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.received}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.cast}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.cast ? `${r.funnyGiven}%` : "—"}</td>
                <td className="px-4 py-3">
                  {p.is_superadmin ? (
                    <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-black">Superadmin</span>
                  ) : (
                    <span className="text-xs text-neutral-500">User</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Read-only. Admin access can only be granted in the Supabase SQL editor, never from the app.
      </p>
    </Shell>
  );
}
