"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/captions", label: "Vote" },
  { href: "/create", label: "Create" },
  { href: "/top", label: "Top" },
  { href: "/mine", label: "Mine" },
];

/** `hasNew`: there are votes on your captions you haven't seen. Shows a dot on Mine. */
export default function NavLinks({ hasNew = false }: { hasNew?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-sm px-1 py-1 font-medium outline-offset-4 transition-colors ${
              active ? "text-white underline decoration-2 underline-offset-8" : "text-neutral-400 hover:text-white"
            }`}
          >
            {label}
            {href === "/mine" && hasNew && !active && (
              <span className="absolute -right-1.5 top-0.5 h-2 w-2 rounded-full bg-amber-400" aria-label="new votes" />
            )}
          </Link>
        );
      })}
    </>
  );
}
