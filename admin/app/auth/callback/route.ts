import { NextResponse } from "next/server";
import { getSupabase } from "@/utils/supabase/server";

// Google -> Supabase -> here with ?code=... . Swap it for a session cookie, then go to the
// dashboard; the dashboard itself checks is_superadmin and sends everyone else to /denied.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const supabase = await getSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=auth_failed`);

  return NextResponse.redirect(`${origin}/`);
}
