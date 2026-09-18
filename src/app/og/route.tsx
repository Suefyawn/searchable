import { ImageResponse } from "next/og";
import { heavyComputeAllowed, publicFont } from "@/lib/platform";
import { SITE } from "@/lib/utils";

import { MARK_HANDLE, MARK_RING } from "@/components/brand";

/** Geist throughout (600 for the headline); read once per instance from public/fonts. */
type Font = { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" };
let fonts: Promise<Font[]> | null = null;
function loadFonts() {
  const read = async (file: string, name: string, weight: 400 | 600): Promise<Font> => ({ name, data: await publicFont(file), weight, style: "normal" });
  fonts ??= Promise.all([read("geist-400.ttf", "Geist", 400), read("geist-600.ttf", "Geist", 600)]);
  return fonts;
}

/** Social card: /og?title=…&kicker=…  Rendered on demand and cached. */
export async function GET(req: Request) {
  // Cards shared before a runtime change keep resolving: answer with the static card instead of rendering one.
  if (!heavyComputeAllowed) return fetch(new URL("/og-card.png", req.url));
  const url = new URL(req.url);
  const title = (url.searchParams.get("title") ?? SITE.tagline).slice(0, 140);
  const kicker = (url.searchParams.get("kicker") ?? "").slice(0, 40);
  const big = title.length < 60;
  const loaded = await loadFonts().catch(() => null);
  // Immutable per title: the CDN keeps it for a year, so a share never re-renders the card.
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#fdfdfc", color: "#1f1d1a", fontFamily: "Geist, sans-serif", fontWeight: 600 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "Geist", fontWeight: 400, fontSize: 22, letterSpacing: 3, textTransform: "uppercase", color: "#1f1d1a" }}>
          <span>{kicker || "Searchable"}</span>
          <span style={{ color: "#8a8680" }}>searchable.pk</span>
        </div>
        <div style={{ display: "flex", fontSize: big ? 78 : 60, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #1f1d1a", paddingTop: 22, fontSize: 30 }}>
          <span style={{ display: "flex", alignItems: "center" }}>
            <svg width="34" height="34" viewBox="0 0 64 64"><path d={MARK_RING} fill="#00458E" fillRule="evenodd" /><path d={MARK_HANDLE} fill="#359EB4" /></svg>
            <span style={{ fontFamily: "Geist", fontWeight: 600, letterSpacing: -1, marginLeft: 10 }}>searchable<span style={{ color: "#1A74A3" }}>.pk</span></span>
          </span>
          <span style={{ fontFamily: "Geist", fontWeight: 400, fontSize: 22, color: "#8a8680" }}>Find what you need. Know what matters.</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=86400, s-maxage=31536000, immutable" }, fonts: loaded ?? undefined },
  );
}
