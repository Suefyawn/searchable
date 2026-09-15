import { ImageResponse } from "next/og";
import { SITE } from "@/lib/utils";

export const runtime = "nodejs";

/** Social card: /og?title=…&kicker=…  Rendered on demand and cached. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = (url.searchParams.get("title") ?? SITE.tagline).slice(0, 140);
  const kicker = (url.searchParams.get("kicker") ?? "").slice(0, 40);
  const big = title.length < 60;
  // Immutable per title: the CDN keeps it for a year, so a share never re-renders the card.
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#fdfdfc", color: "#1f1d1a", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "Inter, Arial, sans-serif", fontSize: 22, letterSpacing: 3, textTransform: "uppercase", color: "#1f1d1a" }}>
          <span>{kicker || "Searchable"}</span>
          <span style={{ color: "#8a8680" }}>searchable.pk</span>
        </div>
        <div style={{ display: "flex", fontSize: big ? 78 : 60, lineHeight: 1.08, letterSpacing: -1, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #1f1d1a", paddingTop: 22, fontSize: 30 }}>
          <span>
            Searchable<span style={{ color: "#8a8680" }}>.pk</span>
          </span>
          <span style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 22, color: "#8a8680" }}>Find what you need. Know what matters.</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=86400, s-maxage=31536000, immutable" } },
  );
}
