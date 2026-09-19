import { timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, rawQuery, rawRun, schema } from "@/db";
import { expireStaleClaims, sendClaimInvites } from "./claims";
import { expireLapsedPlans } from "./commerce";
import { closeExpiredPosts } from "./community";
import { indexArticle } from "./indexers";
import { pingIndexNow } from "./indexnow";
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
/** Photo backfill, mailbox mirror, invites and digests: every half hour is plenty, and it keeps function time low. */
const HEAVY_INTERVAL_MS = 30 * 60_000;
let lastLocalRun = 0;

/** Cron routes: Bearer CRON_SECRET, compared in constant time. Without a secret they are open locally and closed in production. */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Publish everything whose scheduled time has passed. */
export async function publishDueArticles(): Promise<number> {
  const db = await getDb();
  const due = await db.query.articles.findMany({ where: eq(schema.articles.status, "scheduled") });
  const now = Date.now();
  let n = 0;
  for (const a of due) {
    if (!a.scheduledFor || a.scheduledFor.getTime() > now) continue;
    await db.update(schema.articles).set({ status: "published", publishedAt: a.publishedAt ?? new Date(), scheduledFor: null, lastReviewedAt: new Date() }).where(eq(schema.articles.id, a.id));
    await db.insert(schema.articleRevisions).values({ articleId: a.id, title: a.title, body: a.body, note: "Published on schedule" });
    await indexArticle(a.id);
    void pingIndexNow([`/${a.kind === "news" ? "news" : "guides"}`]);
    n++;
  }
  if (n) {
    revalidatePath("/");
    revalidatePath("/news");
    revalidatePath("/guides");
    revalidatePath("/feed.xml");
  }
  return n;
}

export type JobsResult = { ran: boolean; published?: number; newsletters?: unknown; lapsedPlans?: number; invites?: { sent: number; skipped: string }; digests?: { sent: number }; inbox?: { added: number; skipped?: string }; photos?: { tried: number; filled: number }; at?: string };

export async function runDueJobs(opts: { force?: boolean } = {}): Promise<JobsResult> {
  // A staging deployment that shares the production database (migration Phase 1) must never publish, send or
  // expire anything: JOBS_DISABLED=1 in its environment makes every scheduler entry point a no-op.
  if (process.env.JOBS_DISABLED) return { ran: false };
  const now = Date.now();
  if (!opts.force && now - lastLocalRun < JOB_INTERVAL_MS) return { ran: false };
  const db = await getDb();
  // Cross-instance guard: claim the slot only if the last run is older than the interval.
  // The row also remembers when the slow work last ran (heavyAt), so a five-minute pinger does not pay for
  // photo searches and mailbox polling 288 times a day: those run every HEAVY_INTERVAL, the rest every time.
  const claimed = await rawQuery<{ key: string; value: string | null }>(
    db,
    sql`insert into settings (key, value, updated_at) values ('jobs:last', ${JSON.stringify({ at: new Date(now).toISOString() })}, ${now})
        on conflict (key) do update set value = json_patch(coalesce(settings.value, '{}'), excluded.value), updated_at = ${now}
        where ${opts.force ? sql`1` : sql`settings.updated_at < ${now - 270_000}`}
        returning key, value`,
  );
  lastLocalRun = now;
  if (!claimed.length) return { ran: false };
  const published = await publishDueArticles();
  const newsletters = await sendDueIssues();
  const lapsedPlans = await expireLapsedPlans();
  const value = claimed[0].value ? (JSON.parse(claimed[0].value) as { heavyAt?: string }) : null;
  const heavyAt = Date.parse(value?.heavyAt ?? "") || 0;
  if (now - heavyAt < HEAVY_INTERVAL_MS) return { ran: true, published, newsletters, lapsedPlans, at: new Date().toISOString() };
  await rawRun(db, sql`update settings set value = json_patch(value, ${JSON.stringify({ heavyAt: new Date(now).toISOString() })}) where key = 'jobs:last'`);
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
  const now = Date.now();
  out.analyticsEvents = await rawRun(db, sql`delete from analytics_events where created_at < ${now - 90 * 86_400_000}`);
  out.searchQueries = await rawRun(db, sql`delete from search_queries where created_at < ${now - 180 * 86_400_000}`);
  out.verifications = await rawRun(db, sql`delete from ${schema.verifications} where expires_at < ${now - 7 * 86_400_000}`);
  out.expiredClaims = await expireStaleClaims();
  out.closedPosts = await closeExpiredPosts();
  return out;
}
