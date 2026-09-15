import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AdminPage, Details, Section } from "@/components/admin";
import { Button } from "@/components/ui";
import { getDb, rawQuery, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { emailAllowance } from "@/lib/email";
import { formatDate, timeAgo } from "@/lib/format";
import { runDueJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

async function runJobsNow() {
  "use server";
  await requireRole("admin");
  await runDueJobs({ force: true });
  revalidatePath("/admin/system");
}

/** What is running, what it costs, and whether the free allowances are safe (docs/FREE-TIER.md). */
export default async function AdminSystem() {
  const db = await getDb();
  const [jobs, ingest, budget, allowance, [sizes], [rows]] = await Promise.all([
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
  ]);
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
      </div>
    </AdminPage>
  );
}
