import { NextResponse } from "next/server";
import { runDueJobs } from "@/lib/jobs";

// Ingestion, sends and image processing take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

/**
 * Scheduled publishing, newsletter sends and plan expiry. Point a free external pinger (cron-job.org,
 * every 5 minutes, header "authorization: Bearer $CRON_SECRET") at this; the daily Vercel cron and the
 * live feed poll also run it, so nothing waits more than a few minutes even without the pinger.
 * If CRON_SECRET is unset (local dev), the endpoint is open.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runDueJobs({ force: true });
  return NextResponse.json({ ok: true, ...result });
}
