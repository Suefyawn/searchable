import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AdminPage, Details, Section } from "@/components/admin";
import { Button } from "@/components/ui";
import { getDb, rawQuery, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { emailAllowance } from "@/lib/email";
import { formatDate, timeAgo } from "@/lib/format";
import { runDueJobs } from "@/lib/jobs";
import { removeSampleContent, type SampleSeed } from "@/lib/sample-content";

export const dynamic = "force-dynamic";

async function runJobsNow() {
  "use server";
  await requireRole("admin");
  await runDueJobs({ force: true });
  revalidatePath("/admin/system");
}

/** Delete the demonstration articles and businesses the sample seed created (comments, reviews and photos cascade). */
async function removeSample() {
  "use server";
  await requireRole("admin");
  await removeSampleContent();
  revalidatePath("/admin/system");
}

/** What is running, what it costs, and whether the free allowances are safe (docs/FREE-TIER.md). */
export default async function AdminSystem() {
  const db = await getDb();
  const [jobs, ingest, budget, allowance, [sizes], [rows], sampleRow, api, apiCalls, errs, errCounts] = await Promise.all([
    db.query.settings.findFirst({ where: eq(schema.settings.key, "jobs:last") }),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "ingest:last") }),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "email:budget") }),
    emailAllowance("transactional"),
    rawQuery<{ db: string }>(db, sql`select pg_size_pretty(pg_database_size(current_database())) as db`).catch(() => [{ db: "n/a" }]),
    rawQuery<Record<string, number>>(
      db,
      sql`select
        (select count(*) from search_documents)::int as search_documents,
        (select count(*) from search_queries)::int as search_queries,
        (select count(*) from analytics_events)::int as analytics_events,
        (select count(*) from media)::int as media,
        (select coalesce(sum(bytes), 0) from media)::bigint as media_bytes,
        (select count(*) from data_points)::int as data_points,
        (select count(*) from sessions)::int as sessions`,
    ),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "seed:sample") }),
    rawQuery<{ today: number; week: number; errors_today: number; last_at: string | null }>(
      db,
      sql`select
        count(*) filter (where created_at > now() - interval '1 day')::int as today,
        count(*) filter (where created_at > now() - interval '7 days')::int as week,
        count(*) filter (where created_at > now() - interval '1 day' and (props->>'status')::int >= 400)::int as errors_today,
        max(created_at)::text as last_at
        from analytics_events where name = 'admin_api'`,
    ).then((r) => r[0]),
    rawQuery<{ path: string; method: string; status: number; ms: number; at: string }>(db, sql`select path, props->>'method' as method, (props->>'status')::int as status, (props->>'ms')::int as ms, created_at::text as at from analytics_events where name = 'admin_api' order by created_at desc limit 12`),
    rawQuery<{ path: string; message: string; digest: string | null; route: string | null; source: string; n: number; last_at: string }>(
      db,
      sql`select path, props->>'message' as message, props->>'digest' as digest, props->>'routePath' as route, coalesce(props->>'source', 'server') as source, count(*)::int as n, max(created_at)::text as last_at
        from analytics_events where name = 'error' and created_at > now() - interval '1 day'
        group by path, props->>'message', props->>'digest', props->>'routePath', coalesce(props->>'source', 'server') order by max(created_at) desc limit 20`,
    ),
    rawQuery<{ today: number; week: number }>(db, sql`select count(*) filter (where created_at > now() - interval '1 day')::int as today, count(*) filter (where created_at > now() - interval '7 days')::int as week from analytics_events where name = 'error'`).then((r) => r[0]),
  ]);
  const sample = sampleRow?.value as SampleSeed | undefined;
  const sampleLive = sample
    ? {
        articles: sample.articles.length ? (await db.select({ n: sql<number>`count(*)::int` }).from(schema.articles).where(inArray(schema.articles.slug, sample.articles)))[0]?.n ?? 0 : 0,
        businesses: sample.businesses.length ? (await db.select({ n: sql<number>`count(*)::int` }).from(schema.businesses).where(inArray(schema.businesses.slug, sample.businesses)))[0]?.n ?? 0 : 0,
      }
    : { articles: 0, businesses: 0 };
  const j = jobs?.value as { at?: string } | undefined;
  const ing = ingest?.value as { at?: string; errors?: string[]; results?: { slug: string; status: string; value?: number; message?: string }[] } | undefined;
  const b = budget?.value as { day?: string; dayCount?: number; month?: string; monthCount?: number } | undefined;
  const env = {
    host: process.env.VERCEL ? "Vercel" : process.env.CF_PAGES ? "Cloudflare" : "local",
    database: (process.env.DATABASE_URL ?? "pglite://").startsWith("pglite://") ? "PGlite (local file)" : "Postgres (Supabase)",
    storage: process.env.STORAGE_PROVIDER ?? "local",
    email: process.env.EMAIL_PROVIDER ?? "local",
    cron: process.env.CRON_SECRET ? "secret set" : "open (local)",
    adsense: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? "on" : "off",
    indexnow: process.env.INDEXNOW_KEY ? "on" : "off",
  };

  return (
    <AdminPage
      title="System status"
      description="Free-plan health at a glance. Every number here has a ceiling written down in docs/FREE-TIER.md."
      actions={
        <form action={runJobsNow}>
          <Button size="sm" variant="outline" type="submit">
            Run due jobs now
          </Button>
        </form>
      }
    >
      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Services">
          <Details
            items={[
              { label: "Host", value: env.host },
              { label: "Database", value: env.database },
              { label: "Image storage", value: env.storage === "r2" ? "Cloudflare R2" : env.storage === "supabase" ? "Supabase Storage (metered, switch to R2)" : "local disk" },
              { label: "Email", value: env.email === "resend" ? "Resend" : "local outbox (.data/outbox)" },
              { label: "Cron auth", value: env.cron },
              { label: "AdSense", value: env.adsense },
              { label: "IndexNow", value: env.indexnow },
            ]}
          />
        </Section>
        <Section title="Email budget" description="Resend Free: 100 a day, 3,000 a month. Bulk mail stops 15 short of the daily cap.">
          <Details
            items={[
              { label: "Sent today", value: `${b?.dayCount ?? 0}${b?.day ? ` (${b.day})` : ""}` },
              { label: "Sent this month", value: `${b?.monthCount ?? 0}${b?.month ? ` (${b.month})` : ""}` },
              { label: "Left for transactional", value: `${allowance.today} today · ${allowance.month.toLocaleString()} this month` },
            ]}
          />
        </Section>
        <Section title="Jobs" description="Scheduled publishing, newsletter sends, plan expiry and claim invites run at most every 5 minutes from any request; the daily cron covers the quiet hours.">
          <Details
            items={[
              { label: "Last run", value: j?.at ? `${timeAgo(j.at)} (${formatDate(j.at, { dateStyle: "medium", timeStyle: "short" })})` : "not yet" },
              { label: "Last ingestion", value: ing?.at ? timeAgo(ing.at) : "never" },
              { label: "Ingestion errors", value: ing?.errors?.length ? ing.errors.join("; ") : "none" },
              { label: "Held readings", value: ing?.results?.filter((r) => r.status === "rejected").map((r) => `${r.slug}: ${r.message}`).join("; ") || "none" },
            ]}
          />
        </Section>
        <Section title="Database" description="Supabase Free: 500 MB. Analytics older than 90 days and search logs older than 180 days are pruned daily.">
          <Details
            items={[
              { label: "Size", value: sizes?.db ?? "n/a" },
              { label: "Search documents", value: (rows?.search_documents ?? 0).toLocaleString() },
              { label: "Search log rows", value: (rows?.search_queries ?? 0).toLocaleString() },
              { label: "Analytics events", value: (rows?.analytics_events ?? 0).toLocaleString() },
              { label: "Data points", value: (rows?.data_points ?? 0).toLocaleString() },
              { label: "Media", value: `${(rows?.media ?? 0).toLocaleString()} files · ${(Number(rows?.media_bytes ?? 0) / 1_048_576).toFixed(1)} MB` },
              { label: "Sessions", value: (rows?.sessions ?? 0).toLocaleString() },
            ]}
          />
        </Section>
        <Section title="Automation" description="Writes made through the admin API by the scheduled editorial task. Run reports and the full call log are on /admin/automation.">
          <Details
            items={[
              { label: "Key", value: process.env.ADMIN_API_KEY ? "set" : "not set (API refuses everything)" },
              { label: "Writes today", value: `${api?.today ?? 0}${api?.errors_today ? ` (${api.errors_today} failed)` : ""}` },
              { label: "Writes, 7 days", value: (api?.week ?? 0).toLocaleString() },
              { label: "Last write", value: api?.last_at ? timeAgo(api.last_at) : "never" },
            ]}
          />
          {apiCalls.length ? (
            <ul className="mt-4 divide-y divide-[var(--border)] border-y border-line text-[13.5px]">
              {apiCalls.map((c, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                  <span className="w-14 font-mono text-[12px] text-3">{c.method}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{c.path.replace("/api/admin", "")}</span>
                  <span className={c.status >= 400 ? "font-semibold" : "text-2"}>{c.status}</span>
                  <span className="tabular text-3">{c.ms} ms</span>
                  <span className="text-3">{timeAgo(c.at)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
        <Section title="Errors" description="Uncaught errors from pages, route handlers and server actions (src/instrumentation.ts) and crashes reported by the error page. Grouped by message, last 24 hours; pruned with the other events after 90 days.">
          <Details
            items={[
              { label: "Last 24 hours", value: (errCounts?.today ?? 0).toLocaleString() },
              { label: "Last 7 days", value: (errCounts?.week ?? 0).toLocaleString() },
            ]}
          />
          {errs.length ? (
            <ul className="mt-4 divide-y divide-[var(--border)] border-y border-line text-[13.5px]">
              {errs.map((e, i) => (
                <li key={i} className="py-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{e.path}</span>
                    <span className="text-3">{e.source}</span>
                    <span className="tabular font-semibold">{e.n}×</span>
                    <span className="text-3">{timeAgo(e.last_at)}</span>
                  </div>
                  <p className="mt-0.5 text-2">
                    {e.message}
                    {e.digest ? <span className="ml-2 font-mono text-[11.5px] text-3">{e.digest}</span> : null}
                    {e.route && e.route !== e.path ? <span className="ml-2 font-mono text-[11.5px] text-3">{e.route}</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-2">None in the last day.</p>
          )}
        </Section>
        {sample ? (
          <Section title="Sample content" description="Demonstration articles and businesses from the seed. Fine for testing; remove them before you promote the site so nothing invented gets indexed or cited." action={
            <form action={removeSample}>
              <Button size="sm" variant="outline" type="submit">
                Remove sample content
              </Button>
            </form>
          }>
            <Details
              items={[
                { label: "Articles", value: `${sampleLive.articles} of ${sample.articles.length} still live` },
                { label: "Businesses", value: `${sampleLive.businesses} of ${sample.businesses.length} still live` },
                { label: "Seeded", value: sample.seededAt ? formatDate(sample.seededAt, { dateStyle: "medium", timeStyle: "short" }) : null },
              ]}
            />
          </Section>
        ) : null}
      </div>
    </AdminPage>
  );
}
