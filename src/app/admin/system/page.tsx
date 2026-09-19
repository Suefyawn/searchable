import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AdminPage, Details, Section } from "@/components/admin";
import { Button } from "@/components/ui";
import { getDb, rawQuery, rawRun, schema } from "@/db";
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

/** Dismiss one error: the row goes; if the error happens again it is a new fingerprint and shows again (ADR-48). */
async function dismissError(formData: FormData) {
  "use server";
  await requireRole("admin");
  const fp = String(formData.get("fp") ?? "");
  if (/^[0-9a-f]{16}$/.test(fp)) await rawRun(await getDb(), sql`delete from error_fingerprints where fp = ${fp}`);
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
    // D1 reports the database size on every statement's meta; pragma table-valued functions are not allowed there.
    db.run(sql`select 1`).then((r) => [{ bytes: Number((r as { meta?: { size_after?: number } }).meta?.size_after ?? NaN) }]).catch(() => [{ bytes: NaN }]),
    rawQuery<Record<string, number>>(
      db,
      sql`select
        (select count(*) from search_documents) as search_documents,
        (select count(*) from search_queries) as search_queries,
        (select count(*) from analytics_events) as analytics_events,
        (select count(*) from media) as media,
        (select coalesce(sum(bytes), 0) from media) as media_bytes,
        (select count(*) from data_points) as data_points,
        (select count(*) from sessions) as sessions`,
    ),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "seed:sample") }),
    rawQuery<{ today: number; week: number; errors_today: number; last_at: number | null }>(
      db,
      sql`select
        sum(case when created_at > ${Date.now() - 86_400_000} then 1 else 0 end) as today,
        sum(case when created_at > ${Date.now() - 7 * 86_400_000} then 1 else 0 end) as week,
        sum(case when created_at > ${Date.now() - 86_400_000} and json_extract(props, '$.status') >= 400 then 1 else 0 end) as errors_today,
        max(created_at) as last_at
        from analytics_events where name = 'admin_api'`,
    ).then((r) => r[0]),
    rawQuery<{ path: string; method: string; status: number; ms: number; at: number }>(db, sql`select path, json_extract(props, '$.method') as method, json_extract(props, '$.status') as status, json_extract(props, '$.ms') as ms, created_at as at from analytics_events where name = 'admin_api' order by created_at desc limit 12`),
    rawQuery<{ fp: string; route: string; name: string; message: string; top_frame: string | null; source: string; n: number; first_at: number; last_at: number }>(
      db,
      sql`select fp, route, name, message, top_frame, source, count as n, first_seen as first_at, last_seen as last_at
        from error_fingerprints where last_seen > ${Date.now() - 7 * 86_400_000} order by last_seen desc limit 30`,
    ),
    rawQuery<{ today: number; week: number; open: number }>(db, sql`select count(case when last_seen > ${Date.now() - 86_400_000} then 1 end) as today, count(*) as week, count(case when first_seen > ${Date.now() - 48 * 3_600_000} then 1 end) as open from error_fingerprints where last_seen > ${Date.now() - 7 * 86_400_000}`).then((r) => r[0]),
  ]);
  const sample = sampleRow?.value as SampleSeed | undefined;
  const sampleLive = sample
    ? {
        articles: sample.articles.length ? (await db.select({ n: sql<number>`count(*)` }).from(schema.articles).where(inArray(schema.articles.slug, sample.articles)))[0]?.n ?? 0 : 0,
        businesses: sample.businesses.length ? (await db.select({ n: sql<number>`count(*)` }).from(schema.businesses).where(inArray(schema.businesses.slug, sample.businesses)))[0]?.n ?? 0 : 0,
      }
    : { articles: 0, businesses: 0 };
  const j = jobs?.value as { at?: string } | undefined;
  const ing = ingest?.value as { at?: string; errors?: string[]; results?: { slug: string; status: string; value?: number; message?: string }[] } | undefined;
  const b = budget?.value as { day?: string; dayCount?: number; month?: string; monthCount?: number } | undefined;
  const env = {
    host: process.env.CF_ACCOUNT_ID ? "Cloudflare Workers" : "local",
    database: "Cloudflare D1",
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
              { label: "Size", value: sizes && Number.isFinite(Number(sizes.bytes)) ? `${(Number(sizes.bytes) / 1_048_576).toFixed(1)} MB` : "n/a" },
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
              { label: "Last write", value: api?.last_at ? timeAgo(new Date(api.last_at)) : "never" },
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
                  <span className="text-3">{timeAgo(new Date(c.at))}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
        <Section title="Errors" description="Distinct errors (ADR-48): uncaught server errors from pages, route handlers and server actions, and crashes the browser reported. One row per route and error type, counted. New ones in the last 48 hours show as the badge on Status. Dismiss removes the row; a recurrence comes back as new. Last 7 days.">
          <Details
            items={[
              { label: "Distinct, seen today", value: (errCounts?.today ?? 0).toLocaleString() },
              { label: "Distinct, last 7 days", value: (errCounts?.week ?? 0).toLocaleString() },
              { label: "New in 48 hours", value: (errCounts?.open ?? 0).toLocaleString() },
            ]}
          />
          {errs.length ? (
            <ul className="mt-4 divide-y divide-[var(--border)] border-y border-line text-[13.5px]">
              {errs.map((e, i) => (
                <li key={i} className="py-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{e.route}</span>
                    <form action={dismissError}>
                      <input type="hidden" name="fp" value={e.fp} />
                      <button type="submit" className="text-[12px] text-3 underline-offset-4 hover:underline">
                        Dismiss
                      </button>
                    </form>
                    <span className="text-3">{e.source}</span>
                    <span className="tabular font-semibold">{e.n}×</span>
                    <span className="text-3">first {timeAgo(new Date(e.first_at))}, last {timeAgo(new Date(e.last_at))}</span>
                  </div>
                  <p className="mt-0.5 text-2">
                    <span className="font-medium">{e.name}:</span> {e.message}
                    <span className="ml-2 font-mono text-[11.5px] text-3">{e.fp}</span>
                  </p>
                  {e.top_frame ? <p className="mt-0.5 truncate font-mono text-[11.5px] text-3">{e.top_frame}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-2">None in the last week.</p>
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
