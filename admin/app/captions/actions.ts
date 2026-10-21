"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_PROMPT, requireAdmin } from "@/lib/admin";

// CREATE / UPDATE / DELETE AI-generated media. Each action re-checks admin status first,
// and the database's row level security checks it again.

export type ActionState = { error?: string; ok?: string };

function cleanText(v: FormDataEntryValue | null) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function done(message: string): ActionState {
  revalidatePath("/", "layout");
  return { ok: message };
}

export async function addCaption(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const image_id = String(form.get("image_id") ?? "");
  const content = cleanText(form.get("content"));
  if (!content) return { error: "Write a caption first." };
  if (content.length > 300) return { error: "Keep it under 300 characters." };

  const { error } = await supabase.from("captions").insert({ image_id, content, prompt: ADMIN_PROMPT, model: "admin" });
  if (error) return { error: error.message };
  return done("Caption added.");
}

export async function updateCaption(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = Number(form.get("id"));
  const content = cleanText(form.get("content"));
  if (!content) return { error: "A caption can't be empty. Delete it instead." };
  if (content.length > 300) return { error: "Keep it under 300 characters." };

  const { data, error } = await supabase.from("captions").update({ content }).eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "That caption no longer exists." };
  return done("Saved.");
}

export async function deleteCaption(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = Number(form.get("id"));
  const { data, error } = await supabase.from("captions").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "That caption was already deleted." };
  return done("Caption deleted.");
}

// Deleting a photo removes its captions and their votes too (foreign keys cascade), then the file.
export async function deleteImage(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const { data, error } = await supabase.from("images").delete().eq("id", id).select("storage_path");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "That photo was already deleted." };

  const { error: fileError } = await supabase.storage.from("caption-images").remove([data[0].storage_path]);
  if (fileError) return done(`Photo deleted, but its file couldn't be removed from storage: ${fileError.message}`);
  return done("Photo and its captions deleted.");
}
