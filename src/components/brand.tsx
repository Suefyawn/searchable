import Link from "next/link";
import { SITE } from "@/lib/utils";

/*
 * The mark (ADR-33): a square lens. A heavy square ring in the brand navy with a square-cut handle in the
 * teal accent, the search glass redrawn with the site's own geometry (no rounded corners anywhere). Two
 * paths, no font, so it renders identically in the header, the favicon and social cards.
 */
export const MARK_RING = "M4 4h42v42H4z M13 13v24h24V13z";
export const MARK_HANDLE = "M39.5 46.5 L46.5 39.5 L62 55 L55 62 Z";

export function LensMark({ size = 28, className = "", tone = "brand" }: { size?: number; className?: string; /** brand: navy ring, teal handle. current: both in the text colour (dark surfaces). */ tone?: "brand" | "current" }) {
  const ring = tone === "brand" ? "var(--color-brand-800)" : "currentColor";
  const handle = tone === "brand" ? "var(--color-brand-500)" : "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <path d={MARK_RING} fill={ring} fillRule="evenodd" />
      <path d={MARK_HANDLE} fill={handle} />
    </svg>
  );
}

/** Mark plus the lowercase wordmark. `pkClassName` colours the ".pk" (blue on paper, lighter on ink). */
export function Wordmark({ size = 26, className = "", pkClassName = "text-brand-700", tone = "brand", href = "/" }: { size?: number; className?: string; pkClassName?: string; tone?: "brand" | "current"; href?: string | null }) {
  const inner = (
    <>
      <LensMark size={size} tone={tone} className="shrink-0" />
      <span className="font-sans font-semibold leading-none tracking-[-0.04em]" style={{ fontSize: size * 0.9 }}>
        searchable<span className={pkClassName}>.pk</span>
      </span>
    </>
  );
  const cls = `inline-flex items-center gap-[0.3em] ${className}`;
  return href ? (
    <Link href={href} className={cls} aria-label={`${SITE.name} home`}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}
