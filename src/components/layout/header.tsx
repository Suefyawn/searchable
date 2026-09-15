import Link from "next/link";
import { SITE } from "@/lib/utils";
import { AuthLinks } from "./auth-links";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search-box";

export const NAV = [
  { href: "/news", label: "News" },
  { href: "/guides", label: "Guides" },
  { href: "/tools", label: "Tools" },
  { href: "/businesses", label: "Businesses" },
  { href: "/data", label: "Data" },
  { href: "/cities", label: "Cities" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 font-display text-[19px] font-bold tracking-tight ${className}`} aria-label={`${SITE.name} home`}>
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_6px_16px_-6px_oklch(0.54_0.155_158/0.7)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <span>
        {SITE.name}
        <span className="text-brand-600 dark:text-brand-400">.pk</span>
      </span>
    </Link>
  );
}

export function Header({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
      <div className="glass mx-auto flex h-14 max-w-[76rem] items-center gap-3 rounded-full pl-4 pr-2 sm:pl-5">
        <Logo />
        <nav className="ml-3 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-1.5 text-[14.5px] font-semibold text-2 transition-colors hover:bg-surface-2 hover:text-[var(--text)]">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {showSearch ? <SearchBox className="hidden w-60 md:block lg:w-72" placeholder="Search…" /> : null}
          <AuthLinks />
          <Link href="/newsletter" className="hidden h-10 items-center rounded-full bg-ink-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-ink-800 sm:inline-flex dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100">
            Newsletter
          </Link>
          <MobileNav nav={NAV} />
        </div>
      </div>
    </header>
  );
}
