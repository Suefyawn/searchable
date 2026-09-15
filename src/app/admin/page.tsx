import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, Bars, Section, Stat, Status } from "@/components/admin";
import { getDb, rawQuery, schema } from "@/db";
import { emailAllowance } from "@/lib/email";
import { formatDate, pkr, timeAgo } from "@/lib/format";

type Daily = { d: string; n: number };

/** Counts per day for the last 14 days, zero-filled, oldest first. */
function series(rows: Daily[], days = 14): number[] {
  const map = new Map(rows.map((r) => [String(r.d).slice(0, 10), Number(r.n)]));
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    out.push(map.get(d) ?? 0);
  }
  return out;
}
function delta(cur: number, prev: number): { text: string; up: boolean | null } {
  if (!prev && !cur) return { text: "no change", up: null };
  if (!prev) return { text: "new", up: true };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}% vs prior week`, up: pct > 0 ? true : pct < 0 ? false : null };
}

export default async function AdminDashboard() {
  const db = await getDb();
  const [[k], searchDaily, toolDaily, subDaily, pubDaily, recent, zero, jobs, ingest, allowance, queue] = await Promise.all([
    rawQuery<Record<string, number>>(
      db,
      sql`select
        (select count(*) from articles where status = 'published')::int as published,
        (select count(*) from articles where status = 'published' and published_at > now() - interval '7 days')::int as published_week,
        (select count(*) from articles where status = 'published' and published_at between now() - interval '14 days' and now() - interval '7 days')::int as published_prev,
        (select count(*) from search_queries where created_at > now() - interval '7 days')::int as searches_week,
        (select count(*) from search_queries where created_at between now() - interval '14 days' and now() - interval '7 days')::int as searches_prev,
        (select count(*) from search_queries where created_at > now() - interval '7 days' and result_count = 0)::int as zero_week,
        (select count(*) from tool_runs where created_at > now() - interval '7 days')::int as runs_week,
        (select count(*) from tool_runs where created_at between now() - interval '14 days' and now() - interval '7 days')::int as runs_prev,
        (select count(*) from newsletter_subscribers where status = 'active')::int as subs,
        (select count(*) from newsletter_subscribers where created_at > now() - interval '7 days')::int as subs_week,
        (select count(*) from newsletter_subscribers where created_at between now() - interval '14 days' and now() - interval '7 days')::int as subs_prev,
        (select count(*) from businesses where status = 'active')::int as businesses,
        (select count(*) from businesses where status = 'active' and claimed_at is not null)::int as claimed,
        (select count(*) from businesses where status = 'active' and is_verified)::int as verified,
        (select coalesce(sum(amount_pkr), 0) from orders where status in ('paid', 'active', 'expired') and paid_at > now() - interval '30 days')::int as revenue_30,
        (select coalesce(sum(amount_pkr), 0) from orders where status in ('paid', 'active', 'expired') and paid_at between now() - interval '60 days' and now() - interval '30 days')::int as revenue_prev,
        (select count(*) from analytics_events where name = 'business_click' and created_at > now() - interval '7 days')::int as clicks_week`,
    ),
    rawQuery<Daily>(db, sql`select date_trunc('day', created_at)::date as d, count(*)::int as n from search_queries where created_at > now() - interval '14 days' group by 1`),
    rawQuery<Daily>(db, sql`select date_trunc('day', created_at)::date as d, count(*)::int as n from tool_runs where created_at > now() - interval '14 days' group by 1`),
    rawQuery<Daily>(db, sql`select date_trunc('day', created_at)::date as d, count(*)::int as n from newsletter_subscribers where created_at > now() - interval '14 days' group by 1`),
    rawQuery<Daily>(db, sql`select date_trunc('day', published_at)::date as d, count(*)::int as n from articles where status = 'published' and published_at > now() - interval '14 days' group by 1`),
    db.query.articles.findMany({ orderBy: [desc(schema.articles.updatedAt)], limit: 8, with: { category: true } }),
    rawQuery<{ query: string; n: number }>(db, sql`select normalized as query, count(*)::int as n from search_queries where created_at > now() - interval '7 days' and result_count = 0 group by normalized order by n desc limit 6`),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "jobs:last") }),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "ingest:last") }),
    emailAllowance("bulk"),
    rawQuery<Record<string, number>>(
      db,
      sql`select
        (select count(*) from businesses where status = 'pending')::int as businesses,
        (select count(*) from business_claims where status = 'pending')::int as claims,
        (select count(*) from professionals where status = 'pending')::int as professionals,
        (select count(*) from business_reviews where status = 'pending')::int as reviews,
        (select count(*) from orders where status = 'pending')::int as orders,
        (select count(*) from submissions where status in ('new', 'reviewing'))::int as submissions,
        (select count(*) from messages where status = 'new')::int as messages,
        (select count(*) from reports where status = 'open')::int as reports,
        (select count(*) from articles where status = 'scheduled' and scheduled_for < now() + interval '1 day')::int as due`,
    ),
  ]);
  const q = queue[0] ?? {};
  const attention = [
    { n: q.businesses, label: "businesses awaiting approval", href: "/admin/businesses?status=pending" },
    { n: q.claims, label: "ownership claims to verify", href: "/admin/claims" },
    { n: q.professionals, label: "professional profiles to approve", href: "/admin/professionals" },
    { n: q.reviews, label: "reviews to moderate", href: "/admin/reviews" },
    { n: q.orders, label: "invoices awaiting payment", href: "/admin/orders?status=pending" },
    { n: q.submissions, label: "pitches to read", href: "/admin/submissions" },
    { n: q.messages, label: "unanswered messages", href: "/admin/messages" },
    { n: q.reports, label: "open reports", href: "/admin/reports" },
    { n: q.due, label: "articles going live in the next day", href: "/admin/articles?status=scheduled" },
  ].filter((a) => a.n > 0);
  const ingestInfo = ingest?.value as { at?: string; errors?: string[]; results?: { status: string }[] } | undefined;
  const jobsInfo = jobs?.value as { at?: string } | undefined;

  return (
    <AdminPage title="Dashboard" description={`${formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}. Publish something useful, then build something.`}>
      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Published this week" value={k?.published_week ?? 0} delta={delta(k?.published_week ?? 0, k?.published_prev ?? 0)} hint={`${k?.published ?? 0} live`} href="/admin/articles?status=published" />
        <Stat label="Searches this week" value={(k?.searches_week ?? 0).toLocaleString()} delta={delta(k?.searches_week ?? 0, k?.searches_prev ?? 0)} hint={`${k?.zero_week ?? 0} found nothing`} href="/admin/search-log" />
        <Stat label="Calculator runs" value={(k?.runs_week ?? 0).toLocaleString()} delta={delta(k?.runs_week ?? 0, k?.runs_prev ?? 0)} hint="last 7 days" href="/tools" />
        <Stat label="Subscribers" value={(k?.subs ?? 0).toLocaleString()} delta={delta(k?.subs_week ?? 0, k?.subs_prev ?? 0)} hint={`+${k?.subs_week ?? 0} this week`} href="/admin/subscribers" />
        <Stat label="Revenue, 30 days" value={pkr(k?.revenue_30 ?? 0)} delta={delta(k?.revenue_30 ?? 0, k?.revenue_prev ?? 0)} href="/admin/orders" />
        <Stat label="Businesses" value={(k?.businesses ?? 0).toLocaleString()} hint={`${k?.claimed ?? 0} claimed · ${k?.verified ?? 0} verified`} href="/admin/businesses?status=active" />
        <Stat label="Contact clicks" value={(k?.clicks_week ?? 0).toLocaleString()} hint="calls, WhatsApp, website, last 7 days" href="/admin/leads" />
        <Stat label="Email budget today" value={allowance.today} hint={`${allowance.month.toLocaleString()} left this month`} href="/admin/system" />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <Section title="Needs attention" description={attention.length ? "Queues with something in them." : "Every queue is empty."}>
            {attention.length ? (
              <ul className="divide-y divide-[var(--border)]">
                {attention.map((a) => (
                  <li key={a.href}>
                    <Link href={a.href} className="flex items-baseline gap-3 py-2 text-[15px] hover:underline underline-offset-4">
                      <span className="w-8 shrink-0 font-serif text-xl tabular">{a.n}</span>
                      <span>{a.label}</span>
                      <span className="ml-auto text-3">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section title="Last 14 days">
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { label: "Searches", values: series(searchDaily) },
                { label: "Calculator runs", values: series(toolDaily) },
                { label: "Articles published", values: series(pubDaily) },
                { label: "New subscribers", values: series(subDaily) },
              ].map((s) => (
                <div key={s.label} className="flex items-end justify-between gap-4 border-b border-line pb-3">
                  <div>
                    <p className="text-[12.5px] text-3">{s.label}</p>
                    <p className="font-serif text-2xl tabular">{s.values.reduce((a, b) => a + b, 0).toLocaleString()}</p>
                  </div>
                  <Bars values={s.values} title={`${s.label}, last 14 days`} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Recently edited" action={<Link href="/admin/articles/new?kind=news" className="text-[13px] font-medium underline-offset-4 hover:underline">+ New article</Link>}>
            <ul className="divide-y divide-[var(--border)]">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/articles/${a.id}`} className="min-w-0 truncate text-[15px] hover:underline underline-offset-4">
                    {a.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2 text-[12.5px] text-3">
                    <Status value={a.status} />
                    {timeAgo(a.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside className="space-y-8 text-[14.5px]">
          <Section title="Searches that found nothing" description="This week. Each one is a guide, calculator or listing to build.">
            {zero.length ? (
              <ul className="divide-y divide-[var(--border)]">
                {zero.map((z) => (
                  <li key={z.query} className="flex items-baseline justify-between gap-3 py-1.5">
                    <Link href={`/admin/articles/new?kind=guide&title=${encodeURIComponent(z.query)}`} className="min-w-0 truncate hover:underline underline-offset-4">
                      {z.query}
                    </Link>
                    <span className="tabular text-3">{z.n}×</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-3">None this week.</p>
            )}
          </Section>
          <Section title="System">
            <ul className="space-y-1.5 text-2">
              <li>
                Data ingestion: {ingestInfo?.at ? timeAgo(ingestInfo.at) : "never"}
                {ingestInfo?.errors?.length ? <span className="text-[var(--text)]"> · {ingestInfo.errors.length} errors</span> : null}
              </li>
              <li>Scheduled jobs: {jobsInfo?.at ? timeAgo(jobsInfo.at) : "not yet run"}</li>
              <li>
                Email: {allowance.today} left today
              </li>
              <li>
                <Link href="/admin/system" className="underline-offset-4 hover:underline">Full status →</Link>
              </li>
            </ul>
          </Section>
          <Section title="Daily rhythm">
            <ol className="list-decimal space-y-1 pl-5 text-2">
              <li>Scan story ideas, draft 3 to 5 stories, 1 guide</li>
              <li>Check the data hub, force any held reading</li>
              <li>Approve businesses, verify claims, moderate reviews</li>
              <li>Mark invoices paid, answer pitches and messages</li>
              <li>Queue the next newsletter issue</li>
            </ol>
          </Section>
        </aside>
      </div>
    </AdminPage>
  );
}
