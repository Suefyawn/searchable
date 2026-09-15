import { sql } from "drizzle-orm";
import Link from "next/link";
import { getDb, rawQuery } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminSearchLog() {
  const db = await getDb();
  const [top, zero] = await Promise.all([
    rawQuery<{ query: string; n: number; avg: number }>(db, sql`select normalized as query, count(*)::int as n, round(avg(result_count))::int as avg from search_queries where created_at > now() - interval '30 days' group by normalized order by n desc limit 50`),
    rawQuery<{ query: string; n: number; last: string }>(db, sql`select normalized as query, count(*)::int as n, max(created_at) as last from search_queries where result_count = 0 group by normalized order by n desc, last desc limit 50`),
  ]);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">Search log</h1>
        <p className="mb-4 text-sm text-2">What people ask Searchable. Top queries, last 30 days.</p>
        <ul className="surface divide-y divide-[var(--border)]">
          {top.map((r) => (
            <li key={r.query} className="flex items-center justify-between px-4 py-2 text-[15px]">
              <Link href={`/search?q=${encodeURIComponent(r.query)}`} className="hover:text-brand-700">{r.query}</Link>
              <span className="tabular text-sm text-3">{r.n} × · {r.avg} results</span>
            </li>
          ))}
          {!top.length ? <li className="px-4 py-6 text-center text-2">No searches yet.</li> : null}
        </ul>
      </section>
      <section>
        <h2 className="mb-1 text-2xl font-semibold">Zero results</h2>
        <p className="mb-4 text-sm text-2">Your content backlog. Each of these is a guide, tool or listing to build.</p>
        <ul className="surface divide-y divide-[var(--border)]">
          {zero.map((r) => (
            <li key={r.query} className="flex items-center justify-between px-4 py-2 text-[15px]">
              <span>{r.query}</span>
              <span className="flex items-center gap-3 text-sm text-3">
                <span className="tabular">{r.n} ×</span>
                <Link href={`/admin/articles/new?kind=guide`} className="font-medium text-brand-700 dark:text-brand-300">Write guide</Link>
              </span>
            </li>
          ))}
          {!zero.length ? <li className="px-4 py-6 text-center text-2">Every search found something.</li> : null}
        </ul>
      </section>
    </div>
  );
}
