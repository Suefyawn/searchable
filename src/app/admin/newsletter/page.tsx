import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, EmptyRow, Status, Table, TBody, Td, THead } from "@/components/admin";
import { Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { emailAllowance } from "@/lib/email";
import { formatDate } from "@/lib/format";
import { assembleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminNewsletter() {
  await requireRole("editor");
  const db = await getDb();
  const [issues, counts, allowance] = await Promise.all([
    db.query.newsletterIssues.findMany({ orderBy: [desc(schema.newsletterIssues.createdAt)], limit: 100 }),
    db
      .select({ frequency: schema.newsletterSubscribers.frequency, n: sql<number>`count(*)` })
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.status, "active"))
      .groupBy(schema.newsletterSubscribers.frequency),
    emailAllowance("bulk"),
  ]);
  const active = Object.fromEntries(counts.map((c) => [c.frequency, c.n])) as Record<string, number>;
  const progressRows = await db.query.settings.findMany({ where: sql`${schema.settings.key} like 'newsletter:progress:%'` });
  const progress = new Map(progressRows.map((r) => [r.key.replace("newsletter:progress:", ""), r.value as { offset: number; sent: number }]));

  return (
    <AdminPage
      title="Searchable Daily"
      description={`Assemble an issue from today's numbers, stories, a guide and the tool of the day; edit; send a test; then send or schedule. Active: ${active.daily ?? 0} daily, ${active.weekly ?? 0} weekly. Email allowance now: ${allowance.today} today. An issue larger than the allowance sends in daily parts on its own.`}
      actions={
        <>
          <form action={assembleAction}>
            <input type="hidden" name="frequency" value="daily" />
            <Button size="sm" type="submit">
              Assemble today&rsquo;s daily
            </Button>
          </form>
          <form action={assembleAction}>
            <input type="hidden" name="frequency" value="weekly" />
            <Button size="sm" variant="outline" type="submit">
              Assemble the weekly digest
            </Button>
          </form>
        </>
      }
    >
      <Table>
        <THead cols={["Subject", "Type", "Status", { label: "Recipients", align: "right" }, "Created"]} />
        <TBody>
          {issues.map((i) => {
            const p = progress.get(i.id);
            return (
              <tr key={i.id}>
                <Td>
                  <Link href={`/admin/newsletter/${i.id}`} className="font-medium underline-offset-4 hover:underline">
                    {i.subject}
                  </Link>
                  {i.preheader ? <span className="block text-[12.5px] text-3">{i.preheader}</span> : null}
                </Td>
                <Td muted>{i.frequency}</Td>
                <Td>
                  <Status value={i.status} />
                  {i.status === "scheduled" && i.scheduledFor ? <span className="block text-[12.5px] text-3">{formatDate(i.scheduledFor, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> : null}
                  {i.status === "sent" && i.sentAt ? <span className="block text-[12.5px] text-3">{formatDate(i.sentAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> : null}
                  {p ? <span className="block text-[12.5px] text-3">{p.sent} sent so far, continues tomorrow</span> : null}
                </Td>
                <Td align="right" muted>
                  {i.recipientCount || p?.sent || "-"}
                </Td>
                <Td muted className="whitespace-nowrap text-[13px]">
                  {formatDate(i.createdAt)}
                </Td>
              </tr>
            );
          })}
          {issues.length === 0 ? <EmptyRow colSpan={5}>No issues yet. Assemble one above.</EmptyRow> : null}
        </TBody>
      </Table>
    </AdminPage>
  );
}
