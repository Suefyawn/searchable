import { sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, EmptyRow, Section, Stat, Table, TBody, Td, THead } from "@/components/admin";
import { getDb, rawQuery } from "@/db";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

/** What people ask, what they click, and what we could not answer. The content backlog lives here. */
export default async function AdminSearchLog() {
  const db = await getDb();
  const [[k], top, zero, clicked, lowClick] = await Promise.all([
    rawQuery<Record<string, number>>(
      db,
      sql`select
        (select count(*) from search_queries where created_at > ${Date.now() - 30 * 86_400_000}) as total,
        (select count(distinct normalized) from search_queries where created_at > ${Date.now() - 30 * 86_400_000}) as distinct_q,
        (select count(*) from search_queries where created_at > ${Date.now() - 30 * 86_400_000} and result_count = 0) as zero,
        (select count(*) from search_queries where created_at > ${Date.now() - 30 * 86_400_000} and clicked_url is not null) as clicked`,
    ),
    rawQuery<{ query: string; n: number; avg: number; clicks: number }>(db, sql`select normalized as query, count(*) as n, round(avg(result_count)) as avg, count(clicked_url) as clicks from search_queries where created_at > ${Date.now() - 30 * 86_400_000} group by normalized order by n desc limit 40`),
    rawQuery<{ query: string; n: number; last: number }>(db, sql`select normalized as query, count(*) as n, max(created_at) as last from search_queries where result_count = 0 and created_at > ${Date.now() - 90 * 86_400_000} group by normalized order by n desc, last desc limit 40`),
    rawQuery<{ url: string; n: number }>(db, sql`select clicked_url as url, count(*) as n from search_queries where clicked_url is not null and created_at > ${Date.now() - 30 * 86_400_000} group by clicked_url order by n desc limit 15`),
    rawQuery<{ query: string; n: number }>(db, sql`select normalized as query, count(*) as n from search_queries where created_at > ${Date.now() - 30 * 86_400_000} and result_count > 0 group by normalized having count(*) >= 3 and count(clicked_url) = 0 order by n desc limit 15`),
  ]);
  const ctr = k?.total ? Math.round(((k.clicked ?? 0) / k.total) * 100) : 0;

  return (
    <AdminPage title="Search log" description="Last 30 days. A query with results but no clicks means the results were wrong or the title did not promise the answer; a zero-result query is something to build." wide>
      <div className="mb-8 grid gap-x-6 gap-y-6 sm:grid-cols-4">
        <Stat label="Searches" value={(k?.total ?? 0).toLocaleString()} hint={`${(k?.distinct_q ?? 0).toLocaleString()} distinct`} />
        <Stat label="Found nothing" value={(k?.zero ?? 0).toLocaleString()} hint={k?.total ? `${Math.round(((k.zero ?? 0) / k.total) * 100)}% of searches` : undefined} />
        <Stat label="Clicked a result" value={`${ctr}%`} hint={`${(k?.clicked ?? 0).toLocaleString()} clicks`} />
        <Stat label="Suggest index" value={<Link href="/suggest-index.json" className="text-base underline underline-offset-4">view</Link>} hint="refreshes hourly" />
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Top queries">
          <Table>
            <THead cols={["Query", { label: "Searches", align: "right" }, { label: "Avg results", align: "right" }, { label: "Clicks", align: "right" }]} />
            <TBody>
              {top.map((r) => (
                <tr key={r.query}>
                  <Td>
                    <Link href={`/search?q=${encodeURIComponent(r.query)}`} className="hover:underline underline-offset-4">
                      {r.query}
                    </Link>
                  </Td>
                  <Td align="right" muted>
                    {r.n}
                  </Td>
                  <Td align="right" muted>
                    {r.avg}
                  </Td>
                  <Td align="right" muted>
                    {r.clicks}
                  </Td>
                </tr>
              ))}
              {!top.length ? <EmptyRow colSpan={4}>No searches yet.</EmptyRow> : null}
            </TBody>
          </Table>
        </Section>
        <Section title="Found nothing" description="Last 90 days. Each is a guide, calculator or listing to build.">
          <Table>
            <THead cols={["Query", { label: "Times", align: "right" }, "Last", ""]} />
            <TBody>
              {zero.map((r) => (
                <tr key={r.query}>
                  <Td>{r.query}</Td>
                  <Td align="right" muted>
                    {r.n}
                  </Td>
                  <Td muted className="whitespace-nowrap text-[13px]">
                    {timeAgo(new Date(r.last))}
                  </Td>
                  <Td align="right">
                    <Link href={`/admin/articles/new?kind=guide&title=${encodeURIComponent(r.query)}`} className="whitespace-nowrap text-[13px] font-medium underline-offset-4 hover:underline">
                      Write guide
                    </Link>
                  </Td>
                </tr>
              ))}
              {!zero.length ? <EmptyRow colSpan={4}>Every search found something.</EmptyRow> : null}
            </TBody>
          </Table>
        </Section>
        <Section title="Results with no clicks" description="Three or more searches, results shown, nobody clicked. Check the ranking or the titles.">
          <Table>
            <THead cols={["Query", { label: "Searches", align: "right" }]} />
            <TBody>
              {lowClick.map((r) => (
                <tr key={r.query}>
                  <Td>
                    <Link href={`/search?q=${encodeURIComponent(r.query)}`} className="hover:underline underline-offset-4">
                      {r.query}
                    </Link>
                  </Td>
                  <Td align="right" muted>
                    {r.n}
                  </Td>
                </tr>
              ))}
              {!lowClick.length ? <EmptyRow colSpan={2}>Nothing to flag.</EmptyRow> : null}
            </TBody>
          </Table>
        </Section>
        <Section title="Most clicked results">
          <Table>
            <THead cols={["Page", { label: "Clicks", align: "right" }]} />
            <TBody>
              {clicked.map((r) => (
                <tr key={r.url}>
                  <Td>
                    <Link href={r.url} className="font-mono text-[13px] hover:underline underline-offset-4">
                      {r.url}
                    </Link>
                  </Td>
                  <Td align="right" muted>
                    {r.n}
                  </Td>
                </tr>
              ))}
              {!clicked.length ? <EmptyRow colSpan={2}>No clicks recorded yet.</EmptyRow> : null}
            </TBody>
          </Table>
        </Section>
      </div>
    </AdminPage>
  );
}
