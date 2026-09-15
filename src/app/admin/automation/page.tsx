import { sql } from "drizzle-orm";
import { AdminPage, Details, Section } from "@/components/admin";
import { getDb, rawQuery } from "@/db";
import { readReports } from "@/lib/automation-reports";
import { readBacklog } from "@/lib/backlog";
import { formatDate, timeAgo } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

/** What the scheduled editorial task has been doing: its own reports, the API calls behind them, the backlog it works. */
export default async function AutomationPage() {
  const db = await getDb();
  const [reports, backlog, api, calls] = await Promise.all([
    readReports(),
    readBacklog(),
    rawQuery<{ today: number; week: number; errors_today: number; last_at: string | null }>(
      db,
      sql`select
        count(*) filter (where created_at > now() - interval '1 day')::int as today,
        count(*) filter (where created_at > now() - interval '7 days')::int as week,
        count(*) filter (where created_at > now() - interval '1 day' and (props->>'status')::int >= 400)::int as errors_today,
        max(created_at)::text as last_at
        from analytics_events where name = 'admin_api'`,
    ).then((r) => r[0]),
    rawQuery<{ path: string; method: string; status: number; ms: number; at: string }>(db, sql`select path, props->>'method' as method, (props->>'status')::int as status, (props->>'ms')::int as ms, created_at::text as at from analytics_events where name = 'admin_api' order by created_at desc limit 25`),
  ]);
  const open = backlog.filter((b) => b.status === "open").length;
  const done = backlog.filter((b) => b.status === "done").length;
  return (
    <AdminPage title="Automation" description="The scheduled editorial task runs six times a day through the admin API (docs/DAILY-TASK.md). Its reports land here; the calls behind them are logged below." wide>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Section title="Run reports" description={reports.length ? `${reports.length} kept, newest first.` : "None yet: the task files one at the end of each run with POST /api/admin/report."}>
            <div className="divide-y divide-[var(--border)] border-y border-line">
              {reports.map((r) => (
                <details key={r.id} className="group py-3">
                  <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-4 gap-y-1 text-[14.5px]">
                    <span className="font-medium">{r.slot}</span>
                    <span className="text-3">{formatDate(r.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-[13px] text-2">
                      {r.published !== undefined ? `${r.published} published` : ""}
                      {r.updated !== undefined ? ` · ${r.updated} updated` : ""}
                      {r.errors ? ` · ${r.errors} error${r.errors === 1 ? "" : "s"}` : ""}
                    </span>
                    <span className="ml-auto text-[12px] text-3 group-open:hidden">open</span>
                  </summary>
                  <div className="prose-searchable mt-3 max-w-[72ch] text-[14.5px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(r.report) }} />
                </details>
              ))}
            </div>
          </Section>
        </div>
        <aside className="space-y-8 self-start">
          <Details
            items={[
              { label: "Key", value: process.env.ADMIN_API_KEY ? "set" : "not set (API refuses everything)" },
              { label: "Writes today", value: `${api?.today ?? 0}${api?.errors_today ? ` (${api.errors_today} failed)` : ""}` },
              { label: "Writes, 7 days", value: (api?.week ?? 0).toLocaleString() },
              { label: "Last write", value: api?.last_at ? timeAgo(api.last_at) : "never" },
              { label: "Backlog", value: `${open} open · ${done} done` },
            ]}
          />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-3">Last calls</p>
            <ul className="divide-y divide-[var(--border)] border-y border-line text-[13px]">
              {calls.map((c, i) => (
                <li key={i} className="flex items-center gap-x-2 py-1.5">
                  <span className="w-12 font-mono text-[11.5px] text-3">{c.method}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{c.path.replace("/api/admin", "")}</span>
                  <span className={c.status >= 400 ? "font-semibold" : "text-2"}>{c.status}</span>
                  <span className="text-3">{timeAgo(c.at)}</span>
                </li>
              ))}
              {calls.length === 0 ? <li className="py-3 text-2">No calls yet.</li> : null}
            </ul>
          </div>
        </aside>
      </div>
    </AdminPage>
  );
}
