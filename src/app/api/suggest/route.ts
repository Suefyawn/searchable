import { NextResponse } from "next/server";
import { suggest } from "@/lib/search";

/** Live suggestions (businesses, news) for a typed prefix. CDN-cached per query so repeat prefixes are free. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const items = await suggest(q, 8);
  return NextResponse.json(items, { headers: { "cache-control": "public, max-age=120, s-maxage=1800, stale-while-revalidate=86400" } });
}
