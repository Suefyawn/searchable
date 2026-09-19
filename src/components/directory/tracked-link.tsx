"use client";

import * as React from "react";

type Kind = "call" | "whatsapp" | "website" | "directions" | "email";

/** Anchor that records a business contact click (beacon) before navigating. */
export function TrackedLink({ businessId, kind, href, className, children, target, rel }: { businessId: string; kind: Kind; href: string; className?: string; children: React.ReactNode; target?: string; rel?: string }) {
  function track() {
    try {
      const body = JSON.stringify({ name: "business_click", path: location.pathname, props: { businessId, kind } });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
    } catch {
      /* ignore */
    }
  }
  return (
    <a href={href} className={className} target={target} rel={rel} onClick={track} onAuxClick={track}>
      {children}
    </a>
  );
}

/**
 * One page_view beacon per business page load. The page itself is served from the edge cache, so the server
 * render cannot count views; this reaches /api/track, which bumps view_count and emits directory_view.
 */
export function ViewPing({ businessId, category, city }: { businessId: string; category?: string | null; city?: string | null }) {
  React.useEffect(() => {
    try {
      const body = JSON.stringify({ name: "page_view", path: location.pathname, props: { businessId, category: category ?? "", city: city ?? "" } });
      if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
    } catch {
      /* ignore */
    }
  }, [businessId, category, city]);
  return null;
}
