import Link from "next/link";
import { avatarFor, getSession } from "@/lib/profile";
import Avatar from "./Avatar";

export default async function NavBar() {
  const { user, profile } = await getSession();
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user?.email || "";

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Captions
        </Link>
        {user ? (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/captions" className="hover:underline">
              Feed
            </Link>
            <Link href="/profile" className="flex items-center gap-2 hover:underline">
              <Avatar src={avatarFor(user, profile)} name={name} size={28} />
              <span className="hidden sm:inline">Profile</span>
            </Link>
          </div>
        ) : (
          <Link href="/login" className="text-sm hover:underline">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
