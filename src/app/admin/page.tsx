import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { getDb, rawQuery, schema } from "@/db";
import { Badge, SectionHeader } from "@/components/ui";
import { formatDate, timeAgo } from "@/lib/format";

async function count(where?: ReturnType<typeof eq>) {
  const db = await getDb();
  return db.$count(schema.articles, where);
}

export default async function AdminDashboard() {
  const db = await getDb();
  const [published, drafts, businesses, pending, verified, subs, activeSubs, searches, zeroResult, toolRuns, leads, pendingReviews] = await Promise.all([
    count(eq(schema.articles.status, "published")),
    count(eq(schema.articles.status, "draft")),
    db.$count(schema.businesses, eq(schema.businesses.status, "active")),
    db.$count(schema.businesses, eq(schema.businesses.status, "pending")),
    db.$count(schema.businesses, eq(schema.businesses.isVerified, true)),
    db.$count(schema.newsletterSubscribers),
    db.$count(schema.newsletterSubscribers, eq(schema.newsletterSubscribers.status, "active")),
    db.$count(schema.searchQueries),
    db.$count(schema.searchQueries, eq(schema.searchQueries.resultCount, 0)),
    db.$count(schema.toolRuns),
    db.$count(schema.businessLeads),
    db.$count(schema.businessReviews, eq(schema.businessReviews.status, "pending")),
  ]);
  const [recent, topSearches, topTools] = await Promise.all([
    db.query.articles.findMany({ orderBy: [desc(schema.articles.updatedAt)], limit: 8, with: { category: true } }),
    rawQuery<{ query: string; n: number; zero: number }>(db, sql`select normalized as query, count(*)::int as n, sum(case when result_count = 0 then 1 else 0 end)::int as zero from search_queries where created_at > now() - interval '30 days' group by normalized order by n desc limit 10`),
    db.query.tools.findMany({ orderBy: [desc(schema.tools.runCount)], limit: 5 }),
  ]);

  const stats = [
    ["Published", published, "/admin/articles?status=published"],
    ["Drafts", drafts, "/admin/articles?status=draft"],
    ["Businesses", businesses, "/admin/businesses"],
    ["Pending review", pending, "/admin/businesses?status=pending"],
    ["Verified", verified, "/admin/businesses"],
    ["Subscribers (active / total)", `${activeSubs} / ${subs}`, "/admin/subscribers"],
    ["Searches (zero-result)", `${searches} (${zeroResult})`, "/admin/search-log"],
    ["Tool runs", toolRuns, "/tools"],
    ["Leads", leads, "/admin/leads"],
    ["Reviews to moderate", pendingReviews, "/admin/reviews"],
  ] as const;

  return (
    <div>
      <SectionHeader as="h1" title="Dashboard" description={`Today is ${formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}. Two tracks: publish something useful, then build something.`} />
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(([label, value, href]) => (
          <Link key={label} href={href} className="surface p-4 hover:border-brand-300">
            <p className="text-xs font-medium uppercase tracking-wider text-3">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular">{value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recently edited</h2>
            <Link href="/admin/articles/new" className="text-sm font-medium text-brand-700 dark:text-brand-300">
              + New article
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/admin/articles/${a.id}`} className="min-w-0 truncate text-[15px] hover:text-brand-700">
                  {a.title}
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-xs text-3">
                  <Badge tone={a.status === "published" ? "success" : a.status === "draft" ? "neutral" : "warning"}>{a.status}</Badge>
                  {timeAgo(a.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="surface p-5">
          <h2 className="font-semibold">Top searches (30 days)</h2>
          <p className="text-sm text-3">Zero-result queries are your content backlog.</p>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {topSearches.map((s) => (
              <li key={s.query} className="flex items-center justify-between py-2 text-[15px]">
                <Link href={`/search?q=${encodeURIComponent(s.query)}`} className="hover:text-brand-700">
                  {s.query}
                </Link>
                <span className="tabular text-sm text-3">
                  {s.n}
                  {s.zero ? <span className="ml-2 text-red-600">{s.zero} zero</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="surface p-5">
          <h2 className="font-semibold">Most used tools</h2>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {topTools.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-[15px]">
                <span>{t.name}</span>
                <span className="tabular text-sm text-3">{t.runCount} runs</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="surface p-5">
          <h2 className="font-semibold">Daily checklist</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px] text-2">
            <li>Research: scan sources, capture 5–10 candidates</li>
            <li>Publish 3–5 news pieces + 1 guide (each links to a tool/guide/entity)</li>
            <li>Update any changed rate; ship or update a tool</li>
            <li>Add 10 businesses, verify 5, clear the pending queue</li>
            <li>Product work per roadmap</li>
            <li>Social posts; prepare tomorrow&rsquo;s newsletter</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
