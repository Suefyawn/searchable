import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { activeBreaking, readFrontPage } from "@/lib/front-page";
import { getMegaNav } from "@/lib/mega-nav";
import { AuthLinks } from "./auth-links";
import { MegaMenu } from "./mega-menu";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search-box";

/* Five sections (ADR-33): the directory holds businesses, professionals, cities and community; data holds
   prices, currency, comparisons and the daily pages. */
export const NAV = [
  { href: "/news", label: "News" },
  { href: "/guides", label: "Guides" },
  { href: "/tools", label: "Tools" },
  { href: "/businesses", label: "Directory" },
  { href: "/data", label: "Data" },
];

export function Logo({ className = "" }: { className?: string }) {
  return <Wordmark size={26} className={className} />;
}

export async function Header({ showSearch = true }: { showSearch?: boolean }) {
  const [sections, front] = await Promise.all([getMegaNav(), readFrontPage()]);
  const breaking = activeBreaking(front);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[var(--bg)]">
      {/* Breaking bar: set from /admin/front-page or the admin API, gone when it expires. Black on every page. */}
      {breaking ? (
        <div className="bg-ink-900 text-white">
          <div className="container-x flex items-center gap-3 py-1.5 text-[13.5px]">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em]">Breaking</span>
            {breaking.href ? (
              <Link href={breaking.href} className="min-w-0 truncate underline-offset-4 hover:underline">
                {breaking.text}
              </Link>
            ) : (
              <span className="min-w-0 truncate">{breaking.text}</span>
            )}
          </div>
        </div>
      ) : null}
      <div className="container-x">
        {/* One line: wordmark, sections, search, account. The mega panel is positioned against this container. */}
        <div className="relative flex h-14 items-center gap-4 sm:h-[60px]">
          <Logo />
          <MegaMenu sections={sections} />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {showSearch ? <SearchBox hotkey className="hidden w-56 md:block lg:w-72" placeholder="Search…" /> : null}
            <Link href="/newsletter" className="hidden h-9 items-center px-3 text-sm font-medium text-2 hover:bg-surface-2 hover:text-[var(--text)] lg:inline-flex">
              Newsletter
            </Link>
            <AuthLinks />
            <MobileNav nav={NAV} sections={sections.map((s) => ({ key: s.key, label: s.label, href: s.href, links: s.columns.flatMap((c) => c.links).slice(0, 12) }))} />
          </div>
        </div>
      </div>
    </header>
  );
}
