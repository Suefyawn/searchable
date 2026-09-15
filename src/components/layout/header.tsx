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
  { href: "/cities", label: "Cities" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`} aria-label={`${SITE.name} home`}>
      <span className="grid size-8 place-items-center rounded-lg bg-brand-700 text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <span className="text-[17px]">
        {SITE.name}
        <span className="text-brand-600">.pk</span>
      </span>
    </Link>
  );
}

export function Header({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[var(--bg)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg)]/70">
      <div className="container-x flex h-16 items-center gap-4">
        <Logo />
        <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-[15px] font-medium text-2 hover:bg-surface-2 hover:text-[var(--text)] transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {showSearch ? <SearchBox className="hidden md:block w-72 lg:w-80" placeholder="Search…" /> : null}
          <AuthLinks />
          <Link href="/newsletter" className="hidden sm:inline-flex h-9 items-center rounded-md bg-brand-700 px-3.5 text-sm font-medium text-white hover:bg-brand-800">
            Newsletter
          </Link>
          <MobileNav nav={NAV} />
        </div>
      </div>
    </header>
  );
}
