import { redirect } from "next/navigation";
import { avatarFor, getSession } from "@/lib/profile";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold">Profile</h1>
      <p className="mb-8 text-sm text-neutral-500">How you appear in the app.</p>
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        first={profile?.first_name ?? ""}
        last={profile?.last_name ?? ""}
        avatar={avatarFor(user, profile)}
      />
      <form action="/auth/signout" method="post" className="mt-12 border-t border-black/10 pt-6 dark:border-white/10">
        <button className="text-sm text-red-600 hover:underline">Sign out</button>
      </form>
    </main>
  );
}
