import { desc, eq, sql } from "drizzle-orm";
import { getDb, rawQuery, schema } from "@/db";
import { listSeriesWithLatest } from "@/db/queries/data";
import { withAdminApi } from "@/lib/admin-api";
import { emailAllowance } from "@/lib/email";
import { popularSearches } from "@/lib/search";
import { SITE } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/context: one call that tells the automation where the site stands right now.
 * Recent articles (so it does not repeat itself), queue sizes, latest data readings, what people searched for
 * and found nothing on, email budget, and the last job run.
 */
export const GET = withAdminApi(async () => {
  const db = await getDb();
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [recent, drafts, scheduled, queues, series, searches, misses, allowance, jobs, ingest] = await Promise.all([
    db.query.articles.findMany({ where: eq(schema.articles.status, "published"), orderBy: [desc(schema.articles.publishedAt)], limit: 40, columns: { id: true, kind: true, slug: true, title: true, publishedAt: true, categoryId: true }, with: { category: { columns: { slug: true } } } }),
    db.query.articles.findMany({ where: sql`${schema.articles.status} in ('draft', 'research', 'editing', 'fact_check')`, orderBy: [desc(schema.articles.updatedAt)], limit: 20, columns: { id: true, kind: true, slug: true, title: true, status: true, updatedAt: true } }),
    db.query.articles.findMany({ where: eq(schema.articles.status, "scheduled"), orderBy: [schema.articles.scheduledFor], limit: 20, columns: { id: true, kind: true, slug: true, title: true, scheduledFor: true } }),
    rawQuery<Record<string, number>>(
      db,
      sql`select
        (select count(*) from businesses where status = 'pending')::int as businesses_pending,
        (select count(*) from business_claims where status = 'pending')::int as claims_pending,
        (select count(*) from professionals where status = 'pending')::int as professionals_pending,
        (select count(*) from posts where status = 'pending')::int as posts_pending,
        ((select count(*) from business_reviews where status = 'pending') + (select count(*) from professional_reviews where status = 'pending'))::int as reviews_pending,
        (select count(*) from reports where status = 'open')::int as reports_open,
        (select count(*) from inbox_messages where status = 'new')::int as inbox_new,
        (select count(*) from messages where status = 'new')::int as messages_new,
        (select count(*) from orders where status = 'pending')::int as orders_pending,
        (select count(*) from submissions where status in ('new', 'reviewing'))::int as pitches_new,
        (select count(*) from newsletter_subscribers where status = 'active')::int as subscribers,
        (select count(*) from businesses where status = 'active')::int as businesses_live,
        (select count(*) from professionals where status = 'active')::int as professionals_live,
        (select count(*) from posts where status = 'published')::int as posts_live`,
    ).then((r) => r[0] ?? {}),
    listSeriesWithLatest(),
    popularSearches(15),
    db.select({ query: schema.searchQueries.query, n: sql<number>`count(*)::int` }).from(schema.searchQueries).where(sql`${schema.searchQueries.resultCount} = 0 and ${schema.searchQueries.createdAt} > ${since.toISOString()}`).groupBy(schema.searchQueries.query).orderBy(desc(sql`count(*)`)).limit(15),
    emailAllowance("transactional"),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "jobs:last") }),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "ingest:last") }),
  ]);
  const articleUrl = (a: { kind: string; slug: string; category?: { slug: string } | null }) => `/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}`;
  return {
    site: SITE.url,
    now: new Date().toISOString(),
    nowKarachi: new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "full", timeStyle: "short" }),
    recentArticles: recent.map((a) => ({ id: a.id, kind: a.kind, title: a.title, url: articleUrl(a), publishedAt: a.publishedAt })),
    drafts,
    scheduled,
    queues,
    data: series.map((s) => ({ slug: s.slug, name: s.name, unit: s.unit, frequency: s.frequency, latest: s.latest, previous: s.previous })),
    topSearches: searches,
    searchesWithNoResults: misses,
    email: { leftToday: allowance.today, leftThisMonth: allowance.month },
    lastJobsRun: (jobs?.value as { at?: string } | undefined)?.at ?? null,
    lastIngestion: (ingest?.value as { at?: string; errors?: string[] } | undefined) ?? null,
    weekSince: since.toISOString(),
  };
});
