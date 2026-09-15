import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { search, type SearchEntityType } from "@/lib/search";

export async function GET(req: Request) {
  const rl = await rateLimit("search", LIMITS.search.limit, LIMITS.search.windowMs);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const type = url.searchParams.get("type");
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const result = await search(q, { types: type ? [type as SearchEntityType] : undefined, limit });
  return NextResponse.json(result);
}
