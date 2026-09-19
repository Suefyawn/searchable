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
  const [recent, drafts, scheduled, queues, series, searches, misses, allowance, jobs, ingest, byCity, byCategory, desks] = await Promise.all([
    db.query.articles.findMany({ where: eq(schema.articles.status, "published"), orderBy: [desc(schema.articles.publishedAt)], limit: 40, columns: { id: true, kind: true, slug: true, title: true, publishedAt: true, categoryId: true }, with: { category: { columns: { slug: true } } } }),
    db.query.articles.findMany({ where: sql`${schema.articles.status} in ('draft', 'research', 'editing', 'fact_check')`, orderBy: [desc(schema.articles.updatedAt)], limit: 20, columns: { id: true, kind: true, slug: true, title: true, status: true, updatedAt: true } }),
    db.query.articles.findMany({ where: eq(schema.articles.status, "scheduled"), orderBy: [schema.articles.scheduledFor], limit: 20, columns: { id: true, kind: true, slug: true, title: true, scheduledFor: true } }),
    rawQuery<Record<string, number>>(
      db,
      sql`select
        (select count(*) from businesses where status = 'pending') as businesses_pending,
        (select count(*) from business_claims where status = 'pending') as claims_pending,
        (select count(*) from professionals where status = 'pending') as professionals_pending,
        (select count(*) from posts where status = 'pending') as posts_pending,
        ((select count(*) from business_reviews where status = 'pending') + (select count(*) from professional_reviews where status = 'pending')) as reviews_pending,
        (select count(*) from reports where status = 'open') as reports_open,
        (select count(*) from inbox_messages where status = 'new') as inbox_new,
        (select count(*) from messages where status = 'new') as messages_new,
        (select count(*) from orders where status = 'pending') as orders_pending,
        (select count(*) from submissions where status in ('new', 'reviewing')) as pitches_new,
        (select count(*) from newsletter_subscribers where status = 'active') as subscribers,
        (select count(*) from businesses where status = 'active') as businesses_live,
        (select count(*) from professionals where status = 'active') as professionals_live,
        (select count(*) from posts where status = 'published') as posts_live`,
    ).then((r) => r[0] ?? {}),
    listSeriesWithLatest(),
    popularSearches(15),
    db.select({ query: schema.searchQueries.query, n: sql<number>`count(*)` }).from(schema.searchQueries).where(sql`${schema.searchQueries.resultCount} = 0 and ${schema.searchQueries.createdAt} > ${since.getTime()}`).groupBy(schema.searchQueries.query).orderBy(desc(sql`count(*)`)).limit(15),
    emailAllowance("transactional"),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "jobs:last") }),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "ingest:last") }),
    rawQuery<{ city: string; n: number }>(db, sql`select l.slug as city, count(*) as n from businesses b join locations l on l.id = b.city_id where b.status = 'active' group by l.slug order by n desc`),
    rawQuery<{ category: string; n: number }>(db, sql`select c.slug as category, count(*) as n from businesses b join business_categories c on c.id = b.primary_category_id where b.status = 'active' group by c.slug order by n desc`),
    rawQuery<{ category: string; stories: number; newestAt: number | null; hoursSince: number | null }>(
      db,
      sql`select c.slug as category, count(a.id) as stories, max(a.published_at) as "newestAt",
        (${Date.now()} - max(a.published_at)) / 3600000.0 as "hoursSince"
        from categories c left join articles a on a.category_id = c.id and a.kind = 'news' and a.status = 'published'
        where c.kind = 'news' group by c.slug order by max(a.published_at) nulls first, c.slug`,
    ),
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
    // Where the directory is thin, so the next additions go where they count (every category and city
    // is listed; zero means nothing live there yet).
    directory: { live: (queues as { businesses_live?: number }).businesses_live ?? 0, byCity, byCategory },
    // News desks, stalest first: how many stories each category holds and hours since its newest one
    // (null when the desk has never had a story). The task tops up desks older than 48 hours.
    newsDesks: desks.map((d) => ({ ...d, newestAt: d.newestAt == null ? null : new Date(Number(d.newestAt)).toISOString(), hoursSince: d.hoursSince == null ? null : Math.round(Number(d.hoursSince)) })),
    data: series.map((s) => ({ slug: s.slug, name: s.name, unit: s.unit, frequency: s.frequency, latest: s.latest, previous: s.previous })),
    topSearches: searches,
    searchesWithNoResults: misses,
    email: { leftToday: allowance.today, leftThisMonth: allowance.month },
    lastJobsRun: (jobs?.value as { at?: string } | undefined)?.at ?? null,
    lastIngestion: (ingest?.value as { at?: string; errors?: string[] } | undefined) ?? null,
    weekSince: since.toISOString(),
  };
});
