import { desc, sql } from "drizzle-orm";
import { AdminPage, EmptyRow, Stat, Status, Table, TBody, Td, THead } from "@/components/admin";
import { getDb, rawQuery, schema } from "@/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminSubscribers() {
  const db = await getDb();
  const [rows, byStatus, byTopic, byFreq] = await Promise.all([
    db.query.newsletterSubscribers.findMany({ orderBy: [desc(schema.newsletterSubscribers.createdAt)], limit: 200 }),
    rawQuery<{ status: string; n: number }>(db, sql`select status, count(*) as n from newsletter_subscribers group by status`),
    rawQuery<{ topic: string; n: number }>(db, sql`select t.value as topic, count(*) as n from newsletter_subscribers, json_each(topics) as t where status = 'active' group by t.value order by n desc`),
    rawQuery<{ frequency: string; n: number }>(db, sql`select frequency, count(*) as n from newsletter_subscribers where status = 'active' group by frequency`),
  ]);
  const n = (s: string) => byStatus.find((x) => x.status === s)?.n ?? 0;
  const daily = byFreq.find((f) => f.frequency === "daily")?.n ?? 0;
  const weekly = byFreq.find((f) => f.frequency === "weekly")?.n ?? 0;
  return (
    <AdminPage title="Subscribers" description={`Double opt-in list. Sends per issue: ${daily} daily + ${weekly} weekly. On the free email plan that is about 90 a day, so the newsletter pauses and resumes across days once the list outgrows it.`}>
      <div className="mb-8 grid gap-x-6 gap-y-6 sm:grid-cols-4">
        <Stat label="Active" value={n("active").toLocaleString()} hint={`${daily} daily · ${weekly} weekly`} />
        <Stat label="Pending confirmation" value={n("pending").toLocaleString()} />
        <Stat label="Unsubscribed" value={n("unsubscribed").toLocaleString()} />
        <Stat label="Top topic" value={byTopic[0]?.topic ?? "-"} hint={byTopic.slice(0, 4).map((t) => `${t.topic} ${t.n}`).join(" · ")} />
      </div>
      <Table>
        <THead cols={["Email", "Status", "Frequency", "Topics", "Source", "Joined"]} />
        <TBody>
          {rows.map((s) => (
            <tr key={s.id}>
              <Td>{s.email}</Td>
              <Td>
                <Status value={s.status} />
              </Td>
              <Td muted>{s.frequency}</Td>
              <Td muted className="text-[13px]">
                {s.topics.join(", ")}
              </Td>
              <Td muted className="text-[13px]">
                {s.source}
              </Td>
              <Td muted className="whitespace-nowrap text-[13px]">
                {formatDate(s.createdAt)}
              </Td>
            </tr>
          ))}
          {!rows.length ? <EmptyRow colSpan={6}>No subscribers yet.</EmptyRow> : null}
        </TBody>
      </Table>
      <p className="mt-4 text-[13px] text-3">
        Locally, confirmation emails are written to <code>.data/outbox/</code>. Open the .eml file and follow the link to test double opt-in.
      </p>
    </AdminPage>
  );
}
