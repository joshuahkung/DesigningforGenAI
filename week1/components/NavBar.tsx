import Link from "next/link";
import { getActivity } from "@/lib/captions";
import { avatarFor, getSession } from "@/lib/profile";
import Avatar from "./Avatar";
import NavLinks from "./NavLinks";

// Styled after a subway sign: black strip, white type, one thin rule along the top.
export default async function NavBar() {
  const { user, profile } = await getSession();
  const hasNew = user ? (await getActivity()).length > 0 : false;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user?.email || "";

  return (
    <header className="sticky top-0 z-20 bg-sign text-white">
      <div className="mx-auto h-[5px] max-w-5xl px-4 pt-[4px]">
        <div className="h-px bg-white/90" />
      </div>
      <nav className="mx-auto flex h-[calc(var(--nav-h)-5px)] max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Captions
        </Link>
        {user ? (
          <div className="flex items-center gap-4 text-sm sm:gap-6">
            <NavLinks hasNew={hasNew} />
            <Link href="/profile" aria-label="Your profile" className="flex items-center gap-2 rounded-full outline-offset-2">
              <Avatar src={avatarFor(user, profile)} name={name} size={28} />
            </Link>
          </div>
        ) : (
          <Link href="/login" className="text-sm font-medium hover:underline">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
