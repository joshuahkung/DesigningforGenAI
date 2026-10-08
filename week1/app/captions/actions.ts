"use server";

import { getSupabase } from "@/lib/profile";

export type VoteResult =
  | { ok: true; upvotes: number; downvotes: number }
  | { ok: false; error: string; signedOut?: boolean };

/**
 * Record one vote: inserts a row into `votes` for the signed-in user.
 * Server Actions can be called by anyone with the URL, so the login check lives here,
 * and RLS ("Cast own vote") enforces it again in the database.
 */
export async function castVote(captionId: number, value: 1 | -1): Promise<VoteResult> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to vote.", signedOut: true };

  if (!Number.isInteger(captionId) || captionId < 1 || (value !== 1 && value !== -1)) {
    return { ok: false, error: "That vote wasn't valid." };
  }

  // user_id is filled in by the database from the session (default auth.uid()).
  const { error } = await supabase.from("votes").insert({ caption_id: captionId, value });
  // 23505 = this user already voted on this caption. Votes are final, so treat it as done.
  if (error && error.code !== "23505") {
    return { ok: false, error: `That vote didn't save: ${error.message}` };
  }

  const { data: caption } = await supabase
    .from("captions")
    .select("upvotes, downvotes")
    .eq("id", captionId)
    .maybeSingle();

  return { ok: true, upvotes: caption?.upvotes ?? 0, downvotes: caption?.downvotes ?? 0 };
}
