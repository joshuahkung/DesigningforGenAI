/* eslint-disable @next/next/no-img-element */
import Shell, { SectionTitle } from "@/components/Shell";
import { AddCaption, CaptionEditor, DeletePhoto } from "@/components/MediaForms";
import { displayName, fmtDateTime, requireAdmin, styleOf } from "@/lib/admin";
import { loadAll, signed } from "@/lib/data";

export const dynamic = "force-dynamic";

// CREATE / READ / UPDATE / DELETE AI-generated media: every photo with its captions.
export default async function CaptionsPage() {
  const { supabase, user } = await requireAdmin();
  const { profiles, images, captions } = await loadAll(supabase);
  const byId = new Map(profiles.map((p) => [p.id, p]));

  return (
    <Shell active="/captions" email={user.email ?? ""}>
      <SectionTitle>
        Media &amp; captions — {images.length} photos · {captions.length} captions
      </SectionTitle>
      <p className="-mt-1 mb-5 text-sm text-neutral-500">
        Click any caption to edit it. Deleting a photo also deletes its captions and their votes.
      </p>

      {images.length === 0 && <p className="text-neutral-500">No photos yet.</p>}
      <div className="space-y-4">
        {images.map((img) => {
          const caps = captions.filter((c) => c.image_id === img.id);
          const style = caps.length ? styleOf(caps[0].prompt) : null;
          return (
            <article key={img.id} className="grid gap-4 rounded-md border border-white/10 bg-[#111] p-4 sm:grid-cols-[180px_1fr]">
              <div>
                <a href={img.url} target="_blank" rel="noreferrer">
                  <img src={img.url} alt="Uploaded photo" className="aspect-square w-full rounded object-cover sm:w-[180px]" />
                </a>
                <p className="mt-2 text-xs text-neutral-400">{displayName(byId.get(img.user_id))}</p>
                <p className="text-xs text-neutral-500">{fmtDateTime(img.created_at)}</p>
                <div className="mt-2 -ml-2">
                  <DeletePhoto id={img.id} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
                  {style && <span className="rounded border border-white/10 px-1.5 py-0.5">{style}</span>}
                  {caps[0] && caps[0].model !== "admin" && <span>{caps[0].model}</span>}
                </div>
                <ul className="space-y-2">
                  {caps.map((c) => (
                    <li key={c.id} className="flex items-start gap-3">
                      <CaptionEditor id={c.id} content={c.content} />
                      <span
                        className={`w-28 shrink-0 pt-1.5 text-right text-xs tabular-nums ${c.score > 0 ? "text-up-text" : c.score < 0 ? "text-red-400" : "text-neutral-500"}`}
                        title={`${c.upvotes} funny, ${c.downvotes} not funny`}
                      >
                        Score {signed(c.score)} · {c.upvotes}↑ {c.downvotes}↓
                      </span>
                    </li>
                  ))}
                  {caps.length === 0 && <li className="text-sm text-neutral-500">No captions on this photo.</li>}
                </ul>
                <AddCaption imageId={img.id} />
              </div>
            </article>
          );
        })}
      </div>
    </Shell>
  );
}
