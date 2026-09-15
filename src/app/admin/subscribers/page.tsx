import { desc, sql } from "drizzle-orm";
import { Badge } from "@/components/ui";
import { getDb, rawQuery, schema } from "@/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminSubscribers() {
  const db = await getDb();
  const [rows, byStatus, byTopic] = await Promise.all([
    db.query.newsletterSubscribers.findMany({ orderBy: [desc(schema.newsletterSubscribers.createdAt)], limit: 200 }),
    rawQuery<{ status: string; n: number }>(db, sql`select status, count(*)::int as n from newsletter_subscribers group by status`),
    rawQuery<{ topic: string; n: number }>(db, sql`select t as topic, count(*)::int as n from newsletter_subscribers, jsonb_array_elements_text(topics) as t where status = 'active' group by t order by n desc`),
  ]);
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Subscribers</h1>
      <div className="mb-6 flex flex-wrap gap-3">
        {byStatus.map((s) => (
          <div key={s.status} className="surface px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-3">{s.status}</p>
            <p className="text-xl font-semibold tabular">{s.n}</p>
          </div>
        ))}
        {byTopic.map((t) => (
          <div key={t.topic} className="surface px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-3">{t.topic}</p>
            <p className="text-xl font-semibold tabular">{t.n}</p>
          </div>
        ))}
      </div>
      <div className="surface overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead className="text-left text-xs uppercase tracking-wider text-3">
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Frequency</th>
              <th className="px-4 py-2.5 font-medium">Topics</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2.5">{s.email}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={s.status === "active" ? "success" : s.status === "pending" ? "warning" : "neutral"}>{s.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-2">{s.frequency}</td>
                <td className="px-4 py-2.5 text-sm text-2">{s.topics.join(", ")}</td>
                <td className="px-4 py-2.5 text-sm text-3">{s.source}</td>
                <td className="px-4 py-2.5 text-sm text-3">{formatDate(s.createdAt)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-2">
                  No subscribers yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-3">
        Locally, confirmation emails are written to <code>.data/outbox/</code>. Open the .eml file and follow the link to test double opt-in.
      </p>
    </div>
  );
}
