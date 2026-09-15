import Script from "next/script";
import { cn } from "@/lib/utils";

/**
 * AdSense integration, off until NEXT_PUBLIC_ADSENSE_CLIENT is set (ca-pub-…).
 * Slots are named by position so layout never changes when ads go live; each renders a reserved box
 * to avoid layout shift. Slot ids come from the AdSense dashboard via NEXT_PUBLIC_ADSENSE_SLOT_<NAME>.
 *
 * Placement policy (keeps us inside AdSense rules and the reader's patience):
 *  - never inside tool forms or results; never above the fold on tool pages
 *  - at most one in-article unit per 500 words, none in the first two paragraphs
 *  - no ads on admin, account, login, newsletter confirm/unsubscribe, search results
 */
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const AD_SLOTS = {
  leaderboard: { env: "NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD", minHeight: 90, label: "leaderboard" },
  inArticle: { env: "NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE", minHeight: 250, label: "in-article" },
  sidebar: { env: "NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR", minHeight: 250, label: "sidebar" },
  footer: { env: "NEXT_PUBLIC_ADSENSE_SLOT_FOOTER", minHeight: 90, label: "footer" },
} as const;

export function adsEnabled() {
  return !!CLIENT;
}

/** Put once in the root layout. */
export function AdSenseScript() {
  if (!CLIENT) return null;
  return <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`} crossOrigin="anonymous" strategy="afterInteractive" />;
}

export function AdSlot({ name, className }: { name: keyof typeof AD_SLOTS; className?: string }) {
  const slot = AD_SLOTS[name];
  const slotId = process.env[slot.env];
  if (!CLIENT || !slotId) return null;
  return (
    <div className={cn("my-6", className)} aria-label="Advertisement">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-3">Advertisement</p>
      <ins className="adsbygoogle block" style={{ display: "block", minHeight: slot.minHeight }} data-ad-client={CLIENT} data-ad-slot={slotId} data-ad-format={name === "inArticle" ? "fluid" : "auto"} data-ad-layout={name === "inArticle" ? "in-article" : undefined} data-full-width-responsive="true" />
      <Script id={`ads-${name}-${slotId}`} strategy="afterInteractive">{`(adsbygoogle = window.adsbygoogle || []).push({});`}</Script>
    </div>
  );
}
