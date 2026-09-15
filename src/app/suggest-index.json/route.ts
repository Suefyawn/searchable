import { NextResponse } from "next/server";
import { suggestIndex } from "@/lib/search";

export const revalidate = 3600;

/**
 * Evergreen suggestions (tools, guides, data, places, topics) as one small JSON file. The search box
 * fetches it once per session and matches locally, so typing never calls a function or the database.
 */
export async function GET() {
  const data = await suggestIndex();
  return NextResponse.json(data, { headers: { "cache-control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400" } });
}
