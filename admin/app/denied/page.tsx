import { redirect } from "next/navigation";
import { getSupabase } from "@/utils/supabase/server";

// Signed in, but this account is not a superadmin. Shows nothing from the database.
export default async function DeniedPage() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_superadmin");
  if (isAdmin === true) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border border-white/10 bg-sign p-8 text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-down">NO ACCESS</p>
        <h1 className="mt-3 text-2xl font-bold">This account isn&apos;t an admin</h1>
        <p className="mt-2 text-sm break-words text-neutral-400">
          You&apos;re signed in as <span className="text-neutral-200">{user.email}</span>, which doesn&apos;t have admin access.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button className="rounded-full border border-white/20 px-5 py-2 text-sm hover:bg-white/5">Sign out and switch account</button>
        </form>
      </div>
    </main>
  );
}
