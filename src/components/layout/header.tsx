import Link from "next/link";
import { formatDate } from "@/lib/format";
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
  { href: "/compare", label: "Compare" },
  { href: "/cities", label: "Cities" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-baseline font-serif text-[26px] font-medium tracking-tight ${className}`} aria-label={`${SITE.name} home`}>
      {SITE.name}
      <span className="text-ink-500">.pk</span>
    </Link>
  );
}

export function Header({ showSearch = true }: { showSearch?: boolean }) {
  const today = formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[var(--bg)]">
      <div className="container-x">
        {/* Top line: date · tagline · account */}
        <div className="hidden items-center justify-between py-2 text-[12.5px] text-3 sm:flex">
          <span>{today}</span>
          <span className="italic font-serif text-[14px]">{SITE.tagline}</span>
          <span className="flex items-center gap-4">
            <AuthLinks />
            <Link href="/newsletter" className="font-medium text-[var(--text)] underline-offset-4 hover:underline">
              Newsletter
            </Link>
          </span>
        </div>
        {/* Masthead line */}
        <div className="flex h-14 items-center gap-4 border-t border-line sm:h-16">
          <Logo />
          <nav className="ml-4 hidden items-center gap-5 lg:flex" aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-[14.5px] font-medium text-2 underline-offset-[6px] transition-colors hover:text-[var(--text)] hover:underline">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {showSearch ? <SearchBox className="hidden w-64 md:block lg:w-72" placeholder="Search…" /> : null}
            <MobileNav nav={NAV} />
          </div>
        </div>
      </div>
    </header>
  );
}
