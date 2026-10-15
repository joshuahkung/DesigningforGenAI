"use server";

import { revalidatePath } from "next/cache";
import { CAPTION_BUCKET } from "@/lib/captions";
import { getSupabase } from "@/lib/profile";

/** Delete one of your own posts: the photo, its captions, and their votes. */
export async function deletePost(imageId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You've been signed out. Sign in and try again." };
  if (typeof imageId !== "string" || !/^[0-9a-f-]{36}$/.test(imageId)) return { ok: false, error: "That post wasn't found." };

  const { data: image } = await supabase.from("images").select("storage_path").eq("id", imageId).eq("user_id", user.id).maybeSingle();
  if (!image) return { ok: false, error: "That post wasn't found." };

  // RLS ("Delete own image") makes this a no-op for anyone else's post. Captions and votes cascade.
  const { error } = await supabase.from("images").delete().eq("id", imageId).eq("user_id", user.id);
  if (error) return { ok: false, error: `Couldn't delete it: ${error.message}` };

  await supabase.storage.from(CAPTION_BUCKET).remove([image.storage_path]); // best effort
  revalidatePath("/mine");
  revalidatePath("/top");
  return { ok: true };
}

/** Called once the Mine page has been shown: votes before now are no longer "new". */
export async function markActivitySeen(): Promise<void> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ activity_seen_at: new Date().toISOString() }).eq("id", user.id);
}
