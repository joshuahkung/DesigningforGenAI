import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/profile";

export async function POST(request: Request) {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
