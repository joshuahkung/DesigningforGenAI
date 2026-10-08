"use server";

import { revalidatePath } from "next/cache";
import { CAPTION_BUCKET, DAILY_UPLOAD_LIMIT, countRecentUploads } from "@/lib/captions";
import { CAPTION_PROMPT, writeCaptions } from "@/lib/gemini";
import { getSupabase } from "@/lib/profile";

export type GenerateResult =
  | { ok: true; imageUrl: string; captions: { id: number; content: string }[]; uploadsLeft: number }
  | { ok: false; error: string };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * The browser has already uploaded the photo to Storage at `path`.
 * This reads it back, asks Gemini for captions, and saves the image row and the captions
 * (each with the prompt and model that wrote it) so everyone can vote on them.
 */
export async function generateCaptions(path: string): Promise<GenerateResult> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to make captions." };

  // Only a file in this user's own folder. RLS checks the same thing on insert.
  if (typeof path !== "string" || !new RegExp(`^${user.id}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path)) {
    return { ok: false, error: "That upload didn't go through. Choose the photo again." };
  }

  const used = await countRecentUploads(user.id);
  if (used >= DAILY_UPLOAD_LIMIT) {
    return { ok: false, error: `You've posted ${DAILY_UPLOAD_LIMIT} photos in the last 24 hours. Come back tomorrow for more.` };
  }

  // Read the photo back from Storage.
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

  const result = await writeCaptions({ base64: Buffer.from(bytes).toString("base64"), mimeType });
  if (!result.ok) return result;

  // Save the image, then its captions. user_id is filled in by the database from the session.
  const { data: image, error: imageError } = await supabase
    .from("images")
    .insert({ storage_path: path, url: imageUrl })
    .select("id")
    .single();
  if (imageError || !image) {
    return { ok: false, error: `Couldn't save the photo: ${imageError?.message ?? "unknown error"}` };
  }

  const { data: captions, error: captionError } = await supabase
    .from("captions")
    .insert(result.captions.map((content) => ({ image_id: image.id, content, prompt: CAPTION_PROMPT, model: result.model })))
    .select("id, content")
    .order("id");
  if (captionError || !captions?.length) {
    return { ok: false, error: `Couldn't save the captions: ${captionError?.message ?? "unknown error"}` };
  }

  revalidatePath("/create");
  return { ok: true, imageUrl, captions, uploadsLeft: Math.max(DAILY_UPLOAD_LIMIT - used - 1, 0) };
}
