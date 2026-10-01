"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/profile";

export type ActionState = { error?: string; ok?: boolean };

async function saveProfile(formData: FormData): Promise<ActionState> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  if (!first_name || !last_name) return { error: "Please enter both a first and last name." };

  const update: Record<string, string> = { first_name, last_name, updated_at: new Date().toISOString() };
  const avatar_url = formData.get("avatar_url");
  if (typeof avatar_url === "string" && avatar_url) update.avatar_url = avatar_url;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function completeWelcome(_: ActionState, formData: FormData): Promise<ActionState> {
  const result = await saveProfile(formData);
  if (result.error) return result;
  redirect("/captions");
}

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  return saveProfile(formData);
}
