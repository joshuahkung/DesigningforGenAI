import Link from "next/link";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/users", label: "Users" },
  { href: "/captions", label: "Media & captions" },
  { href: "/votes", label: "Votes" },
];

export default function Shell({ active, email, children }: { active: string; email: string; children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
          <span className="text-sm font-bold tracking-wide">CAPTIONS · ADMIN</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={t.href === active ? "text-white" : "text-neutral-500 hover:text-neutral-300"}
                aria-current={t.href === active ? "page" : undefined}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
            <span className="hidden sm:inline">{email}</span>
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-black">SUPERADMIN</span>
            <form action="/auth/signout" method="post">
              <button className="rounded border border-white/15 px-2.5 py-1 text-neutral-300 hover:bg-white/5">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-8">{children}</main>
    </>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-neutral-500 uppercase">{children}</h2>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-md border border-white/10 bg-[#111] p-4 sm:p-5 ${className}`}>{children}</section>;
}
