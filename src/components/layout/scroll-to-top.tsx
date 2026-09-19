"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * The Vite runtime's router keeps the scroll position across client navigations, so a reader who clicked a link in
 * the footer landed at the footer of the next page. On a pathname change this scrolls to the top, except after
 * back or forward, where the browser's own restoration is the right behaviour, and except for hash links.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const popped = React.useRef(false);
  React.useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  React.useEffect(() => {
    if (popped.current) {
      popped.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
