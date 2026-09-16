"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

/** Microsoft Clarity project for searchable.pk (free tier: session replays, heatmaps, rage clicks). */
const PROJECT = process.env.NEXT_PUBLIC_CLARITY_ID ?? "yjegkfbcoe";

/**
 * Clarity's loader, after hydration so it never competes with the page. Not loaded on admin, account or
 * dashboard pages, so editors' and owners' sessions are never recorded.
 */
export function ClarityScript() {
  const pathname = usePathname();
  if (!PROJECT || process.env.NODE_ENV !== "production") return null;
  if (/^\/(admin|account|business|professional)(\/|$)/.test(pathname)) return null;
  return (
    <Script id="clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(PROJECT)});`}
    </Script>
  );
}
