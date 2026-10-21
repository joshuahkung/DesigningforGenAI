import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./admin";

export type Image = { id: string; user_id: string; storage_path: string; url: string; created_at: string };
export type Caption = {
  id: number;
  image_id: string;
  user_id: string;
  content: string;
  prompt: string;
  model: string;
  upvotes: number;
  downvotes: number;
  score: number;
  created_at: string;
};
export type Vote = { id: number; user_id: string; caption_id: number; value: 1 | -1; created_at: string };

// Everything the admin pages need. As a superadmin, row level security lets this session read
// every row; for anyone else these same queries would come back (nearly) empty.
export async function loadAll(supabase: SupabaseClient) {
  const [profiles, images, captions, votes] = await Promise.all([
    supabase.from("profiles").select("id, email, first_name, last_name, avatar_url, is_superadmin, created_at").order("created_at"),
    supabase.from("images").select("id, user_id, storage_path, url, created_at").order("created_at", { ascending: false }),
    supabase
      .from("captions")
      .select("id, image_id, user_id, content, prompt, model, upvotes, downvotes, score, created_at")
      .order("created_at")
      .order("id"),
    supabase.from("votes").select("id, user_id, caption_id, value, created_at").order("created_at", { ascending: false }).limit(10000),
  ]);
  const error = profiles.error ?? images.error ?? captions.error ?? votes.error;
  if (error) throw new Error(`Could not load data: ${error.message}`);
  return {
    profiles: disambiguate((profiles.data ?? []) as Profile[]),
    images: (images.data ?? []) as Image[],
    captions: (captions.data ?? []) as Caption[],
    votes: (votes.data ?? []) as Vote[],
  };
}

// Two accounts with the same name (e.g. a school and a personal Google account) get their
// email handle added, so they can be told apart in the grid and tables.
function disambiguate(list: Profile[]) {
  const count = new Map<string, number>();
  const key = (p: Profile) => `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
  list.forEach((p) => key(p) && count.set(key(p), (count.get(key(p)) ?? 0) + 1));
  return list.map((p) =>
    key(p) && (count.get(key(p)) ?? 0) > 1 && p.email ? { ...p, last_name: `${p.last_name ?? ""} (${p.email.split("@")[0]})`.trim() } : p,
  );
}

export const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);
export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
