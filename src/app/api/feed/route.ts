import { NextResponse } from "next/server";
import { activityFeed } from "@/lib/activity";
import { runDueJobs } from "@/lib/jobs";

export const revalidate = 300;

/** Live feed for the home hero panel: our stories, press headlines, data readings. */
export async function GET() {
  // Piggyback: this route regenerates at most every 5 minutes, and a visitor on the home page is the
  // cheapest scheduler we have. Awaited so a serverless instance is not torn down mid-publish.
  await runDueJobs().catch(() => ({ ran: false }));
  const items = await activityFeed(24);
  return NextResponse.json({ items, at: new Date().toISOString() }, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
