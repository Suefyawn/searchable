import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { search, type SearchEntityType } from "@/lib/search";
import { TYPE_LABEL } from "@/lib/search-types";

export async function GET(req: Request) {
  const rl = await rateLimit("search", LIMITS.search.limit, LIMITS.search.windowMs);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const type = url.searchParams.get("type");
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const result = await search(q, { types: type && type in TYPE_LABEL ? [type as SearchEntityType] : undefined, limit });
  return NextResponse.json(result, { headers: { "cache-control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
