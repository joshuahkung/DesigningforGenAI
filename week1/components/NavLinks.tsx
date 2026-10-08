"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/captions", label: "Vote" },
  { href: "/create", label: "Create" },
  { href: "/top", label: "Top" },
];

export default function NavLinks() {
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
            className={`rounded-sm px-1 py-1 font-medium outline-offset-4 transition-colors ${
              active ? "text-white underline decoration-2 underline-offset-8" : "text-neutral-400 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
