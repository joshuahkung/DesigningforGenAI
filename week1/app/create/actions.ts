"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { CAPTION_BUCKET, DAILY_UPLOAD_LIMIT, getDailyUsage } from "@/lib/captions";
import { captionPrompt, isStyle, writeCaptions, type Style } from "@/lib/gemini";
import { getSupabase } from "@/lib/profile";

/**
 * Posting is two steps so people can check their photo before anything is saved:
 *   1. draftCaptions: the AI writes captions. Nothing goes into the feed.
 *   2. publishPost:   the user keeps the captions they want, and only then are the image and captions saved.
 *
 * Between the two steps the draft lives in the browser. The server signs it, so publishPost
 * only accepts captions the AI actually wrote for this user's photo, in the style it was asked for.
 */

export type Draft = { path: string; imageUrl: string; style: Style; captions: string[]; model: string; expires: number; token: string };
export type DraftResult = { ok: true; draft: Draft; used: number; nextFreeAt: string | null } | { ok: false; error: string };
export type PublishResult = { ok: true; captions: { id: number; content: string }[] } | { ok: false; error: string };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DRAFT_TTL_MS = 60 * 60 * 1000; // a draft can be posted for up to an hour

function sign(userId: string, d: Omit<Draft, "token">): string {
  const secret = process.env.DRAFT_SECRET || process.env.GEMINI_API_KEY || "";
  return createHmac("sha256", `draft:${secret}`)
    .update(JSON.stringify([userId, d.path, d.imageUrl, d.style, d.captions, d.model, d.expires]))
    .digest("hex");
}

function validSignature(userId: string, d: Draft): boolean {
  const expected = Buffer.from(sign(userId, d), "hex");
  const given = Buffer.from(typeof d.token === "string" ? d.token : "", "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const ownPath = (userId: string, path: unknown): path is string =>
  typeof path === "string" && new RegExp(`^${userId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path);

/** Step 1. The browser has already uploaded the photo to Storage at `path`. Ask the AI for captions; post nothing. */
export async function draftCaptions(path: string, style: Style = "mixed"): Promise<DraftResult> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to make captions." };
  if (!ownPath(user.id, path)) return { ok: false, error: "That upload didn't go through. Choose the photo again." };
  if (!isStyle(style)) style = "mixed";

  // Counts this photo against the daily limit (once), or this press of "New captions" against the photo's 3.
  const { data: claim, error: claimError } = await supabase.rpc("claim_caption_generation", { p_path: path });
  if (claimError) return { ok: false, error: `Couldn't check your daily limit: ${claimError.message}` };
  if (claim === "daily_limit") {
    return { ok: false, error: `You've used all ${DAILY_UPLOAD_LIMIT} photos for the last 24 hours. See below for when the next one frees up.` };
  }
  if (claim === "redo_limit") return { ok: false, error: "That's the most new captions one photo can get. Post your favorites or try another photo." };
  if (claim !== "ok") return { ok: false, error: "That upload didn't go through. Choose the photo again." };

  const imageUrl = supabase.storage.from(CAPTION_BUCKET).getPublicUrl(path).data.publicUrl;
  let bytes: ArrayBuffer;
  let mimeType: string;
  try {
    const res = await fetch(imageUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(String(res.status));
    mimeType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    bytes = await res.arrayBuffer();
  } catch {
    return { ok: false, error: "Couldn't read the photo back after uploading. Try again." };
  }
  if (!ALLOWED_TYPES.includes(mimeType)) return { ok: false, error: "Use a JPG, PNG, or WebP photo." };
  if (bytes.byteLength > MAX_BYTES) return { ok: false, error: "That photo is over 5 MB. Try a smaller one." };

  const result = await writeCaptions({ base64: Buffer.from(bytes).toString("base64"), mimeType }, style);
  if (!result.ok) return result;

  const unsigned = { path, imageUrl, style, captions: result.captions, model: result.model, expires: Date.now() + DRAFT_TTL_MS };
  const usage = await getDailyUsage(user.id);
  return { ok: true, draft: { ...unsigned, token: sign(user.id, unsigned) }, ...usage };
}

/** Step 2. Save the photo and the captions the user kept (by their position in the draft). */
export async function publishPost(draft: Draft, keep: number[]): Promise<PublishResult> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You've been signed out. Sign in and try again." };

  if (!draft || !Array.isArray(draft.captions) || !isStyle(draft.style) || !validSignature(user.id, draft)) {
    return { ok: false, error: "This draft couldn't be verified. Choose the photo again." };
  }
  if (Date.now() > draft.expires) return { ok: false, error: "This draft is over an hour old. Choose the photo again." };

  const picked = [...new Set(Array.isArray(keep) ? keep : [])]
    .filter((i) => Number.isInteger(i) && i >= 0 && i < draft.captions.length)
    .sort((a, b) => a - b)
    .map((i) => draft.captions[i]);
  if (!picked.length) return { ok: false, error: "Keep at least one caption to post." };

  // user_id is filled in by the database from the session.
  const { data: image, error: imageError } = await supabase
    .from("images")
    .insert({ storage_path: draft.path, url: draft.imageUrl })
    .select("id")
    .single();
  if (imageError || !image) {
    const already = imageError?.code === "23505";
    return { ok: false, error: already ? "This photo is already posted." : `Couldn't save the photo: ${imageError?.message ?? "unknown error"}` };
  }

  const prompt = captionPrompt(draft.style);
  const { data: captions, error: captionError } = await supabase
    .from("captions")
    .insert(picked.map((content) => ({ image_id: image.id, content, prompt, model: draft.model })))
    .select("id, content")
    .order("id");
  if (captionError || !captions?.length) {
    await supabase.from("images").delete().eq("id", image.id); // don't leave a photo with no captions
    return { ok: false, error: `Couldn't save the captions: ${captionError?.message ?? "unknown error"}` };
  }

  revalidatePath("/mine");
  return { ok: true, captions };
}

/** "Wrong photo": remove the uploaded file. It still counts toward today's limit, since the AI already ran. */
export async function discardDraft(path: string): Promise<void> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ownPath(user.id, path)) return;
  const { count } = await supabase.from("images").select("id", { count: "exact", head: true }).eq("storage_path", path);
  if (count) return; // already posted: deleting happens on the Mine page
  await supabase.storage.from(CAPTION_BUCKET).remove([path]);
}
