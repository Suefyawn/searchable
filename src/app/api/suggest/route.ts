import { NextResponse } from "next/server";
import { suggest } from "@/lib/search";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const items = await suggest(q, 8);
  return NextResponse.json(items, { headers: { "cache-control": "public, max-age=60" } });
}
