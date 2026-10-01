import { redirect } from "next/navigation";
import { getSession, needsName } from "@/lib/profile";
import WelcomeForm from "./WelcomeForm";

// Shown right after login whenever first/last name are empty.
export default async function WelcomePage() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (!needsName(profile)) redirect("/captions");

  // Suggest the name Google gave us; the user still confirms it.
  const meta = user.user_metadata ?? {};
  const full = String(meta.full_name ?? meta.name ?? "");
  const [g1 = "", ...rest] = full.split(" ");
  const first = profile?.first_name || (meta.given_name as string | undefined) || g1;
  const last = profile?.last_name || (meta.family_name as string | undefined) || rest.join(" ");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">One quick thing</h1>
      <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">
        What should we call you? You can change this anytime in your profile.
      </p>
      <WelcomeForm first={first} last={last} />
    </main>
  );
}
