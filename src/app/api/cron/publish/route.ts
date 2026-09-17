import { NextResponse } from "next/server";
import { cronAuthorized, runDueJobs } from "@/lib/jobs";

// Ingestion, sends and image processing take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

/**
 * Scheduled publishing, newsletter sends and plan expiry. Point a free external pinger (cron-job.org,
 * every 5 minutes, header "authorization: Bearer $CRON_SECRET") at this; the daily Vercel cron and the
 * live feed poll also run it, so nothing waits more than a few minutes even without the pinger.
 * If CRON_SECRET is unset the endpoint is open locally and refused in production.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runDueJobs({ force: true });
  return NextResponse.json({ ok: true, ...result });
}
