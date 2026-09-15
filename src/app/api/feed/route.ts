import { NextResponse } from "next/server";
import { activityFeed } from "@/lib/activity";

export const revalidate = 300;

/** Live feed for the home hero panel: our stories, press headlines, data readings. */
export async function GET() {
  const items = await activityFeed(24);
  return NextResponse.json({ items, at: new Date().toISOString() }, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
