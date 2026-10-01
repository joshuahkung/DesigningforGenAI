import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export async function getSupabase() {
  return createClient(await cookies());
}

export function needsName(profile: Profile | null) {
  return !profile?.first_name?.trim() || !profile?.last_name?.trim();
}

/** Current user + their profile row (either may be null). */
export async function getSession(): Promise<{ user: User | null; profile: Profile | null }> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return { user, profile };
}

/** For gated pages: must be logged in AND have a name, else redirect. */
export async function requireCompleteProfile() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (needsName(profile)) redirect("/welcome");
  return { user, profile: profile! };
}

/** Avatar to show: uploaded photo first, then the Google picture. */
export function avatarFor(user: User | null, profile: Profile | null) {
  return profile?.avatar_url || (user?.user_metadata?.avatar_url as string | undefined) || null;
}
