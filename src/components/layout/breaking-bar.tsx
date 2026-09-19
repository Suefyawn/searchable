"use client";

import Link from "next/link";
import * as React from "react";

/**
 * The breaking bar (set from /admin/front-page or POST /api/admin/front). Black on every page while it is live.
 * The whole bar is the link, the text may take two lines on a phone instead of being cut, and a reader can close
 * it for the rest of the visit (sessionStorage, keyed by the text so a new alert reappears).
 */
export function BreakingBar({ text, href }: { text: string; href?: string | null }) {
  const key = `breaking:${text}`;
  // Server and first client render agree (bar shown); the stored choice is read through useSyncExternalStore so
  // a closed bar disappears on hydration without a state update inside an effect.
  const [closedNow, setClosedNow] = React.useState(false);
  const closedBefore = React.useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return !!sessionStorage.getItem(key);
      } catch {
        return false;
      }
    },
    () => false,
  );
  if (closedBefore || closedNow) return null;
  const close = () => {
    setClosedNow(true);
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // storage blocked: hidden for this page view only
    }
  };
  const body = (
    <>
      <span className="shrink-0 border border-white/40 px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-[0.14em] leading-4">Breaking</span>
      <span className="min-w-0 flex-1 text-[13.5px] leading-5 line-clamp-2 sm:line-clamp-1">{text}</span>
      {href ? <span className="hidden shrink-0 text-[13px] text-white/70 sm:inline">Read the story</span> : null}
    </>
  );
  return (
    <div className="bg-ink-900 text-white" role="region" aria-label="Breaking news">
      <div className="container-x flex items-center gap-3 py-1.5">
        {href ? (
          <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 hover:underline underline-offset-4 decoration-white/60">
            {body}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
        )}
        <button type="button" onClick={close} aria-label="Close breaking news bar" className="-mr-1.5 shrink-0 p-1.5 text-white/70 hover:text-white">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
