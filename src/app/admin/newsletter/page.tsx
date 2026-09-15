import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { assembleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminNewsletter() {
  await requireRole("editor");
  const db = await getDb();
  const [issues, counts] = await Promise.all([
    db.query.newsletterIssues.findMany({ orderBy: [desc(schema.newsletterIssues.createdAt)], limit: 100 }),
    db
      .select({ frequency: schema.newsletterSubscribers.frequency, n: sql<number>`count(*)::int` })
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.status, "active"))
      .groupBy(schema.newsletterSubscribers.frequency),
  ]);
  const active = Object.fromEntries(counts.map((c) => [c.frequency, c.n])) as Record<string, number>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Searchable Daily</h1>
      <p className="mb-6 text-sm text-2">
        Assemble an issue from today’s numbers, stories, a guide and the tool of the day; edit; send a test; then send or schedule. Active subscribers: <strong>{active.daily ?? 0}</strong> daily · <strong>{active.weekly ?? 0}</strong> weekly.
      </p>
      <div className="mb-8 flex flex-wrap gap-3">
        <form action={assembleAction}>
          <input type="hidden" name="frequency" value="daily" />
          <Button size="sm" type="submit">Assemble today’s daily</Button>
        </form>
        <form action={assembleAction}>
          <input type="hidden" name="frequency" value="weekly" />
          <Button size="sm" variant="secondary" type="submit">Assemble this week’s digest</Button>
        </form>
      </div>
      <table className="w-full text-[15px]">
        <thead className="text-left text-xs uppercase tracking-wider text-3">
          <tr className="border-b border-[var(--rule)]">
            <th className="py-2 pr-4 font-medium">Subject</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Recipients</th>
            <th className="py-2 pr-4 font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {issues.map((i) => (
            <tr key={i.id}>
              <td className="py-2 pr-4">
                <Link href={`/admin/newsletter/${i.id}`} className="font-medium underline-offset-4 hover:underline">
                  {i.subject}
                </Link>
                {i.preheader ? <span className="block text-xs text-3">{i.preheader}</span> : null}
              </td>
              <td className="py-2 pr-4 text-sm text-2">{i.frequency}</td>
              <td className="py-2 pr-4">
                <Badge tone={i.status === "sent" ? "success" : i.status === "scheduled" ? "warning" : "neutral"}>{i.status}</Badge>
                {i.status === "scheduled" && i.scheduledFor ? <span className="block text-xs text-3">{formatDate(i.scheduledFor, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> : null}
                {i.status === "sent" && i.sentAt ? <span className="block text-xs text-3">{formatDate(i.sentAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> : null}
              </td>
              <td className="py-2 pr-4 tabular">{i.recipientCount || "—"}</td>
              <td className="py-2 pr-4 text-sm text-3">{formatDate(i.createdAt)}</td>
            </tr>
          ))}
          {issues.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-2">
                No issues yet. Assemble one above.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
