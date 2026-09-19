import { AdminPage, Details, Section, Table } from "@/components/admin";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { metricsConfigured, readMetrics, type DailyCount } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const EVENTS = ["search_performed", "calculator_used", "directory_view", "newsletter_subscribe", "community_post"] as const;
const LABEL: Record<(typeof EVENTS)[number], string> = { search_performed: "Searches", calculator_used: "Calculator runs", directory_view: "Business page views", newsletter_subscribe: "Newsletter sign-ups", community_post: "Community posts" };

/** Product events from Analytics Engine (ADR-48) and data freshness from ingest_runs: what people did, and whether the numbers they saw were current. */
export default async function AdminMetrics() {
  await requireRole("admin");
  const db = await getDb();
  const runs = await db.select().from(schema.ingestRuns);
  const now = Date.now();
  const metrics = metricsConfigured() ? await readMetrics().catch((e: Error) => ({ error: e.message })) : null;
  const days = metrics && !("error" in metrics) ? [...new Set(metrics.daily.map((d) => d.day.slice(0, 10)))].sort() : [];
  const cell = (rows: DailyCount[], event: string, day: string) => rows.filter((r) => r.event === event && r.day.startsWith(day)).reduce((a, r) => a + r.n, 0);

  return (
    <AdminPage title="Metrics" description="Searches, calculator runs, business views, sign-ups and posts over the last 14 days from Workers Analytics Engine (cached 10 minutes), plus how fresh each automatically ingested number is.">
      <Section title="Events by day" description="Each event is one writeDataPoint from src/lib/track.ts; page views are in Cloudflare Web Analytics and Clarity, not here.">
        {!metrics ? (
          <p className="text-[14px] text-2">Not configured: set the CF_ANALYTICS_TOKEN secret (an API token with Account Analytics Read) and the CF_ACCOUNT_ID var on the Worker.</p>
        ) : "error" in metrics ? (
          <p className="text-[14px] text-red-600">Could not read Analytics Engine: {metrics.error}</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>Day</th>
                  {EVENTS.map((e) => (
                    <th key={e} className="text-right">
                      {LABEL[e]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day}>
                    <td className="font-mono text-[12.5px]">{day}</td>
                    {EVENTS.map((e) => (
                      <td key={e} className="tabular text-right">
                        {cell(metrics.daily, e, day).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
                {!days.length ? (
                  <tr>
                    <td colSpan={EVENTS.length + 1} className="text-2">
                      No events yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <TopList title="Top searches, 7 days" rows={metrics.searches} />
              <TopList title="Top calculators, 7 days" rows={metrics.tools} />
              <TopList title="Directory categories viewed, 7 days" rows={metrics.categories} />
            </div>
            <p className="mt-3 text-[12.5px] text-3">Read {timeAgo(new Date(metrics.at))}.</p>
          </>
        )}
      </Section>
      <Section title="Data freshness" description="Last successful ingest per series (GET /api/admin/ingest/status gives the same to the automation). Market series refresh hourly, fuel on the 1st and 16th, the rest daily.">
        <Details
          items={runs
            .sort((a, b) => (b.lastSuccessAt?.getTime() ?? 0) - (a.lastSuccessAt?.getTime() ?? 0))
            .map((r) => ({
              label: r.source,
              value: r.lastSuccessAt ? `${r.lastValue ?? ""} · ${Math.round((now - r.lastSuccessAt.getTime()) / 3_600_000)} h ago${r.lastStatus === "error" || r.lastStatus === "rejected" ? ` · last run ${r.lastStatus}: ${r.lastError ?? ""}` : ""}` : `never succeeded${r.lastError ? `: ${r.lastError}` : ""}`,
            }))}
        />
      </Section>
    </AdminPage>
  );
}

function TopList({ title, rows }: { title: string; rows: { key: string; n: number }[] }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-3">{title}</h3>
      {rows.length ? (
        <ol className="mt-2 divide-y divide-[var(--border)] border-y border-line text-[13.5px]">
          {rows.map((r) => (
            <li key={r.key} className="flex justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate">{r.key}</span>
              <span className="tabular text-2">{Number(r.n).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-[13.5px] text-2">Nothing yet.</p>
      )}
    </div>
  );
}
