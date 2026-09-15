"use client";

import * as React from "react";

/**
 * One delegated click listener for the whole results list. Sends a tiny beacon with the query and the
 * chosen URL so the search log can show which result answered the question (and which never get clicked).
 */
export function ResultsTracker({ q, children }: { q: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const url = a.getAttribute("href") ?? "";
      if (!url.startsWith("/") || url.startsWith("/search")) return;
      try {
        navigator.sendBeacon?.("/api/track", new Blob([JSON.stringify({ name: "search_click", props: { q, url } })], { type: "application/json" }));
      } catch {
        /* ignore */
      }
    }
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [q]);
  return <div ref={ref}>{children}</div>;
}
