import Link from "next/link";
import { formatDate } from "@/lib/format";
import { Wordmark } from "@/components/brand";
import { activeBreaking, readFrontPage } from "@/lib/front-page";
import { getMegaNav } from "@/lib/mega-nav";
import { readSiteSettings } from "@/lib/site-settings";
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
  return <Wordmark size={26} className={className} />;
}

export async function Header({ showSearch = true }: { showSearch?: boolean }) {
  const today = formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const [sections, front, site] = await Promise.all([getMegaNav(), readFrontPage(), readSiteSettings()]);
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
        {/* Top line: date · tagline · account */}
        <div className="hidden items-center justify-between py-2 text-[12.5px] text-3 sm:flex">
          <span>{today}</span>
          <span className="italic font-serif text-[14px]">{site.identity.tagline}</span>
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
