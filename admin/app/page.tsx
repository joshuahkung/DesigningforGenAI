/* eslint-disable @next/next/no-img-element */
import Shell, { Card, SectionTitle } from "@/components/Shell";
import { displayName, requireAdmin, styleOf } from "@/lib/admin";
import { loadAll, pct, signed } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const { supabase, user } = await requireAdmin();
  const { profiles, images, captions, votes } = await loadAll(supabase);

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const captionById = new Map(captions.map((c) => [c.id, c]));
  const imageById = new Map(images.map((i) => [i.id, i]));
  const funny = votes.filter((v) => v.value === 1).length;
  const notFunny = votes.length - funny;
  const posters = new Set(images.map((i) => i.user_id)).size;

  // Leading captions
  const top = [...captions].sort((a, b) => b.score - a.score || b.upvotes - a.upvotes).slice(0, 3);

  // Which humor style lands: share of "funny" votes on captions written in each style
  const styles = new Map<string, { up: number; down: number; captions: number }>();
  for (const c of captions) {
    const s = styleOf(c.prompt);
    const row = styles.get(s) ?? { up: 0, down: 0, captions: 0 };
    row.captions += 1;
    styles.set(s, row);
  }
  for (const v of votes) {
    const c = captionById.get(v.caption_id);
    if (!c) continue;
    const row = styles.get(styleOf(c.prompt))!;
    if (v.value === 1) row.up += 1;
    else row.down += 1;
  }
  const styleRows = [...styles.entries()]
    .map(([name, r]) => ({ name, ...r, rate: pct(r.up, r.up + r.down) }))
    .sort((a, b) => b.rate - a.rate || b.up + b.down - (a.up + a.down));

  // Voter grid: every user who voted or posted, against every caption
  const voteKey = new Map(votes.map((v) => [`${v.user_id}:${v.caption_id}`, v.value]));
  const gridUsers = profiles.filter((p) => votes.some((v) => v.user_id === p.id) || captions.some((c) => c.user_id === p.id));
  const critics = gridUsers
    .map((p) => {
      const mine = votes.filter((v) => v.user_id === p.id);
      return { p, n: mine.length, notRate: pct(mine.filter((v) => v.value === -1).length, mine.length) };
    })
    .filter((c) => c.n > 0)
    .sort((a, b) => b.notRate - a.notRate);
  const selfVotes = votes.filter((v) => captionById.get(v.caption_id)?.user_id === v.user_id);
  const selfFunny = selfVotes.filter((v) => v.value === 1).length;
  const toughest = critics[0];
  const kindest = critics[critics.length - 1];

  const tiles = [
    { k: "Users", v: profiles.length, s: `${posters} posted a photo` },
    { k: "Photos", v: images.length, s: `${captions.length} captions` },
    { k: "Votes cast", v: votes.length, s: `${captions.length ? (votes.length / captions.length).toFixed(1) : "0"} per caption` },
    { k: "Funny rate", v: `${pct(funny, votes.length)}%`, s: `${funny} funny · ${notFunny} not`, green: true },
  ];

  return (
    <Shell active="/" email={user.email ?? ""}>
      <SectionTitle>The board — all time</SectionTitle>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-md border border-white/10 bg-sign px-4 py-4">
            <div className="text-[11px] tracking-[0.15em] text-neutral-500 uppercase">{t.k}</div>
            <div className={`mt-1 text-4xl font-bold tabular-nums ${t.green ? "text-up-text" : ""}`}>{t.v}</div>
            <div className="mt-1 text-xs text-neutral-500">{t.s}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <SectionTitle>Leading captions</SectionTitle>
          {top.length === 0 && <p className="text-sm text-neutral-500">No captions yet.</p>}
          <ol className="space-y-2">
            {top.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded bg-sign p-2.5">
                <img src={imageById.get(c.image_id)?.url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug">{c.content}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {c.upvotes} funny · {c.downvotes} not · {styleOf(c.prompt)} · by {displayName(byId.get(c.user_id))}
                  </p>
                </div>
                <span className={`text-lg font-bold tabular-nums ${c.score > 0 ? "text-up-text" : c.score < 0 ? "text-down" : "text-neutral-500"}`}>
                  {signed(c.score)}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <SectionTitle>Which humor style lands</SectionTitle>
          <div className="space-y-3">
            {styleRows.map((r) => (
              <div key={r.name} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-neutral-300">{r.name}</span>
                <div className="flex h-3.5 flex-1 overflow-hidden rounded-sm bg-white/10" title={`${r.up} funny, ${r.down} not funny`}>
                  {r.up + r.down > 0 && (
                    <>
                      <div className="bg-up" style={{ width: `${r.rate}%` }} />
                      <div className="bg-down" style={{ width: `${100 - r.rate}%` }} />
                    </>
                  )}
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-neutral-500 tabular-nums">
                  {r.up + r.down ? `${r.rate}% funny` : "no votes"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-neutral-500">Share of votes marked funny, by the humor style the caption was generated in.</p>
        </Card>
      </div>

      <Card>
        <SectionTitle>Who votes how — voter × caption</SectionTitle>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0.5 text-xs">
            <thead>
              <tr>
                <th />
                {captions.map((c, i) => (
                  <th key={c.id} className="w-9 font-normal text-neutral-500" title={c.content}>
                    #{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gridUsers.map((p) => (
                <tr key={p.id}>
                  <th className="pr-3 text-left font-normal whitespace-nowrap text-neutral-300">{displayName(p)}</th>
                  {captions.map((c) => {
                    const own = c.user_id === p.id;
                    const v = voteKey.get(`${p.id}:${c.id}`);
                    const fill = v === 1 ? "bg-up text-white" : v === -1 ? "bg-down text-white" : "bg-white/[0.06] text-neutral-600";
                    const ring = own ? "outline-2 -outline-offset-2 outline-dashed outline-white/70" : "";
                    const label = v === 1 ? "↑" : v === -1 ? "↓" : own ? "own" : "–";
                    const what = v === 1 ? "funny" : v === -1 ? "not funny" : "no vote";
                    return (
                      <td
                        key={c.id}
                        className={`h-8 w-9 rounded-sm text-center ${fill} ${ring}`}
                        title={`${displayName(p)} on ${own ? "their own caption" : "caption"} "${c.content}": ${what}`}
                      >
                        {label}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-400">
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-up" />funny <span className="mx-1 ml-3 inline-block h-2.5 w-2.5 rounded-sm bg-down" />not funny · – = hasn&apos;t voted ·{" "}
            <span className="mx-1 inline-block h-2.5 w-2.5 rounded-sm outline-1 outline-dashed outline-white/70" />dashed = their own caption
          </span>
          {toughest && critics.length > 1 && (
            <span>
              Toughest critic: <b className="text-neutral-200">{displayName(toughest.p)}</b> ({toughest.notRate}% not funny) · Easiest crowd:{" "}
              <b className="text-neutral-200">{displayName(kindest.p)}</b> ({kindest.notRate}%)
            </span>
          )}
          {selfVotes.length > 0 && (
            <span>
              Self-votes: <b className="text-neutral-200">{selfVotes.length}</b> of {votes.length} votes were on the voter&apos;s own caption ({pct(selfFunny, selfVotes.length)}% funny)
            </span>
          )}
        </div>
        <ol className="mt-4 grid gap-x-6 gap-y-1 text-xs text-neutral-500 sm:grid-cols-2 lg:grid-cols-3">
          {captions.map((c, i) => (
            <li key={c.id} className="truncate" title={c.content}>
              <span className="text-neutral-400">#{i + 1}</span> {c.content}
            </li>
          ))}
        </ol>
      </Card>
    </Shell>
  );
}
