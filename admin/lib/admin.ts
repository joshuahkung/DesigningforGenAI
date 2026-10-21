import { redirect } from "next/navigation";
import { getSupabase } from "@/utils/supabase/server";

// Login wall, layer 2. Every page and every server action calls this first.
// Signed out -> /login. Signed in but profiles.is_superadmin is not true -> /denied.
export async function requireAdmin() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin, error } = await supabase.rpc("is_superadmin");
  if (error || isAdmin !== true) redirect("/denied");

  return { supabase, user };
}

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_superadmin: boolean;
  created_at: string;
};

export function displayName(p: Pick<Profile, "first_name" | "last_name" | "email"> | undefined | null) {
  if (!p) return "Unknown user";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || p.email || "Unnamed user";
}

// The caption app saves the exact prompt with each caption. Each humor style adds one
// distinctive sentence to that prompt, so the style can be read back from it.
const STYLE_MARKERS: [string, string][] = [
  ["Sarcastic", "All three are sarcastic"],
  ["Absurd", "All three are absurd"],
  ["Relatable", "All three are painfully relatable"],
  ["Wholesome", "All three are wholesome"],
  ["Mixed", "Use a different angle for each one"],
];
export const ADMIN_PROMPT = "Written by an admin in the admin panel.";

export function styleOf(prompt: string) {
  if (prompt === ADMIN_PROMPT) return "Admin-written";
  for (const [label, marker] of STYLE_MARKERS) if (prompt.includes(marker)) return label;
  return "Original";
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}
export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}
