import { getSupabase } from "@/lib/profile";

export const CAPTION_BUCKET = "caption-images";
export const DAILY_UPLOAD_LIMIT = 10; // also enforced by the "Add own image, 10 a day" RLS policy

/** A caption the current user hasn't voted on. No totals: the score shows only after voting. */
export type FeedCaption = { id: number; content: string; image_url: string; created_at: string };

export type TopCaption = FeedCaption & {
  upvotes: number;
  downvotes: number;
  score: number;
  my_vote: 1 | -1 | null;
};

export type Upload = {
  id: string;
  url: string;
  created_at: string;
  captions: { id: number; content: string; upvotes: number; downvotes: number }[];
};

export const RANGES = {
  day: { label: "Today", hours: 24 },
  week: { label: "This week", hours: 24 * 7 },
  all: { label: "All time", hours: null },
} as const;
export type Range = keyof typeof RANGES;

export async function getUnvotedCaptions(limit = 40): Promise<{ captions: FeedCaption[]; error: string | null }> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("unvoted_captions", { max_rows: limit });
  return { captions: (data ?? []) as FeedCaption[], error: error?.message ?? null };
}

export async function getTopCaptions(range: Range): Promise<{ captions: TopCaption[]; error: string | null }> {
  const supabase = await getSupabase();
  const hours = RANGES[range].hours;
  const since = hours ? new Date(Date.now() - hours * 3600_000).toISOString() : null;
  const { data, error } = await supabase.rpc("top_captions", { since, max_rows: 24 });
  return { captions: (data ?? []) as TopCaption[], error: error?.message ?? null };
}

/** How many photos this user has posted in the last 24 hours. */
export async function countRecentUploads(userId: string): Promise<number> {
  const supabase = await getSupabase();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await supabase
    .from("images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return count ?? 0;
}

/**
 * The daily limit counts photos the AI has captioned in the last 24 hours, posted or not,
 * so deleting a post doesn't hand back a free AI call. Each one frees up 24 hours after it was made.
 */
export async function getDailyUsage(userId: string): Promise<{ used: number; nextFreeAt: string | null }> {
  const supabase = await getSupabase();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("caption_drafts")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) return { used: await countRecentUploads(userId), nextFreeAt: null }; // week5 SQL not run yet
  const oldest = data?.[0]?.created_at;
  return {
    used: data?.length ?? 0,
    nextFreeAt: oldest ? new Date(new Date(oldest).getTime() + 24 * 3600_000).toISOString() : null,
  };
}

/** Where each of these captions currently ranks on Top (today and all time), if it's in the top 24. */
export async function getTopRanks(captionIds: number[]): Promise<Map<number, { day?: number; all?: number }>> {
  const ranks = new Map<number, { day?: number; all?: number }>();
  if (!captionIds.length) return ranks;
  const wanted = new Set(captionIds);
  const [day, all] = await Promise.all([getTopCaptions("day"), getTopCaptions("all")]);
  day.captions.forEach((c, i) => wanted.has(c.id) && ranks.set(c.id, { ...ranks.get(c.id), day: i + 1 }));
  all.captions.forEach((c, i) => wanted.has(c.id) && ranks.set(c.id, { ...ranks.get(c.id), all: i + 1 }));
  return ranks;
}

export type Activity = {
  caption_id: number;
  content: string;
  image_url: string;
  new_up: number;
  new_down: number;
  upvotes: number;
  downvotes: number;
  score: number;
  latest: string;
};

/** New votes from other people on the current user's captions since they last opened Mine. */
export async function getActivity(): Promise<Activity[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("my_activity");
  return error ? [] : ((data ?? []) as Activity[]);
}

/** The user's own photos, newest first, each with its captions and how they're scoring. */
export async function getMyUploads(userId: string, limit = 30): Promise<Upload[]> {
  const supabase = await getSupabase();
  const { data: images } = await supabase
    .from("images")
    .select("id, url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!images?.length) return [];

  const { data: captions } = await supabase
    .from("captions")
    .select("id, image_id, content, upvotes, downvotes")
    .in("image_id", images.map((i) => i.id))
    .order("id");

  return images.map((image) => ({
    ...image,
    captions: (captions ?? []).filter((c) => c.image_id === image.id),
  }));
}
