import { redirect } from "next/navigation";
import SignInButton from "@/components/SignInButton";
import { getSupabase } from "@/utils/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border border-white/10 bg-sign p-8 text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-neutral-500">CAPTIONS · ADMIN</p>
        <h1 className="mt-3 text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-sm text-neutral-400">Sign in with Google. Only accounts marked as superadmin in the database get in.</p>
        <div className="mt-6">
          <SignInButton />
        </div>
        {error && <p className="mt-4 text-sm text-red-400">Sign-in failed. Please try again.</p>}
      </div>
    </main>
  );
}
