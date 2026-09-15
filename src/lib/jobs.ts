import { sql } from "drizzle-orm";
import { getDb, rawQuery, schema } from "@/db";
import { publishDueArticles } from "@/app/admin/articles/actions";
import { expireStaleClaims, sendClaimInvites } from "./claims";
import { expireLapsedPlans } from "./commerce";
import { closeExpiredPosts } from "./community";
import { syncInbox } from "./inbox";
import { backfillArticlePhotos } from "./media-import";
import { sendActivityDigests } from "./notify";
import { sendDueIssues } from "./newsletter-issue";

/**
 * The "every few minutes" work: publish scheduled articles, send due newsletter issues, expire lapsed plans.
 *
 * Free hosting plans allow only daily crons, so this does not rely on one. It runs opportunistically from
 * requests that already happen (the live feed poll, admin page loads, the daily cron) and a settings row
 * makes sure it runs at most once per JOB_INTERVAL across every instance. An external pinger such as
 * cron-job.org hitting /api/cron/publish every 5 minutes makes it exact; without one it still runs whenever
 * anyone is on the site.
 */
const JOB_INTERVAL_MS = 5 * 60_000;
let lastLocalRun = 0;

export type JobsResult = { ran: boolean; published?: number; newsletters?: unknown; lapsedPlans?: number; invites?: { sent: number; skipped: string }; digests?: { sent: number }; inbox?: { added: number; skipped?: string }; photos?: { tried: number; filled: number }; at?: string };

export async function runDueJobs(opts: { force?: boolean } = {}): Promise<JobsResult> {
  const now = Date.now();
  if (!opts.force && now - lastLocalRun < JOB_INTERVAL_MS) return { ran: false };
  const db = await getDb();
  // Cross-instance guard: claim the slot only if the last run is older than the interval.
  const claimed = await rawQuery<{ key: string }>(
    db,
    sql`insert into settings (key, value, updated_at) values ('jobs:last', ${JSON.stringify({ at: new Date(now).toISOString() })}::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
        where ${opts.force ? sql`true` : sql`settings.updated_at < now() - interval '4 minutes 30 seconds'`}
        returning key`,
  );
  lastLocalRun = now;
  if (!claimed.length) return { ran: false };
  const published = await publishDueArticles();
  const newsletters = await sendDueIssues();
  const lapsedPlans = await expireLapsedPlans();
  const invites = await sendClaimInvites();
  const digests = await sendActivityDigests();
  // Mirror new mail into the admin inbox; the webhook is faster, this is the safety net.
  const inbox = await syncInbox().catch((e: Error) => ({ added: 0, skipped: e.message }));
  const photos = await backfillArticlePhotos().catch(() => ({ tried: 0, filled: 0 }));
  return { ran: true, published, newsletters, lapsedPlans, invites, digests, inbox, photos, at: new Date().toISOString() };
}

/**
 * Keep the database small enough for a free tier: raw analytics and search logs are only useful for a
 * season, aggregated views in admin cover the rest. Called from the daily ingest cron.
 */
export async function pruneOldRows(): Promise<Record<string, number>> {
  const db = await getDb();
  const out: Record<string, number> = {};
  const events = await rawQuery<{ n: number }>(db, sql`with d as (delete from analytics_events where created_at < now() - interval '90 days' returning 1) select count(*)::int as n from d`);
  out.analyticsEvents = Number(events[0]?.n ?? 0);
  const searches = await rawQuery<{ n: number }>(db, sql`with d as (delete from search_queries where created_at < now() - interval '180 days' returning 1) select count(*)::int as n from d`);
  out.searchQueries = Number(searches[0]?.n ?? 0);
  const rl = await rawQuery<{ n: number }>(db, sql`with d as (delete from ${schema.verifications} where expires_at < now() - interval '7 days' returning 1) select count(*)::int as n from d`);
  out.verifications = Number(rl[0]?.n ?? 0);
  out.expiredClaims = await expireStaleClaims();
  out.closedPosts = await closeExpiredPosts();
  return out;
}
