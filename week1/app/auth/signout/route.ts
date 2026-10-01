import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// Sign out: revoke the session and clear the auth cookies directly on the redirect response.
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.signOut();

  // Belt and braces: remove any leftover Supabase auth cookies.
  request.cookies
    .getAll()
    .filter((c) => c.name.startsWith("sb-"))
    .forEach((c) => response.cookies.set(c.name, "", { path: "/", maxAge: 0 }));

  revalidatePath("/", "layout");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
