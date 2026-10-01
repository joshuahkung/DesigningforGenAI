import { NextResponse } from "next/server";
import { getSupabase, needsName, type Profile } from "@/lib/profile";

// Google -> Supabase -> here with ?code=... . Exchange it for a session cookie,
// then send first-timers (no name yet) to /welcome and everyone else to the gated page.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .eq("id", data.user.id)
    .maybeSingle<Profile>();

  return NextResponse.redirect(`${origin}${needsName(profile) ? "/welcome" : "/captions"}`);
}
