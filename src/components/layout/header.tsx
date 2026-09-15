import Link from "next/link";
import { formatDate } from "@/lib/format";
import { SITE } from "@/lib/utils";
import { getMegaNav } from "@/lib/mega-nav";
import { AuthLinks } from "./auth-links";
import { MegaMenu } from "./mega-menu";
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
  { href: "/community", label: "Community" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-baseline font-serif text-[26px] font-medium tracking-tight ${className}`} aria-label={`${SITE.name} home`}>
      {SITE.name}
      <span className="text-ink-500">.pk</span>
    </Link>
  );
}

export async function Header({ showSearch = true }: { showSearch?: boolean }) {
  const today = formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const sections = await getMegaNav();
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
        {/* Masthead line; the mega panel is positioned against this container */}
        <div className="relative flex h-14 items-center gap-4 border-t border-line sm:h-16">
          <Logo />
          <MegaMenu sections={sections} />
          <div className="ml-auto flex items-center gap-2">
            {showSearch ? <SearchBox hotkey className="hidden w-64 md:block lg:w-72" placeholder="Search…" /> : null}
            <MobileNav nav={NAV} sections={sections.map((s) => ({ key: s.key, label: s.label, href: s.href, links: s.columns.flatMap((c) => c.links).slice(0, 12) }))} />
          </div>
        </div>
      </div>
    </header>
  );
}
