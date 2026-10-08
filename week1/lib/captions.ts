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

/** The user's own photos, newest first, each with its captions and how they're scoring. */
export async function getMyUploads(userId: string, limit = 12): Promise<Upload[]> {
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
