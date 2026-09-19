import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AdminPage, Empty, FilterTabs, Row, Rows, Status } from "@/components/admin";
import { Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
const STATUSES = ["new", "replied", "archived", "all"] as const;

async function setStatus(id: string, status: string) {
  "use server";
  await requireRole("editor");
  const next = z.enum(["new", "replied", "archived"]).parse(status);
  const db = await getDb();
  await db.update(schema.messages).set({ status: next }).where(eq(schema.messages.id, id));
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "new" } = await searchParams;
  const db = await getDb();
  const [rows, counts] = await Promise.all([
    db.query.messages.findMany({ where: status === "all" ? undefined : eq(schema.messages.status, status), orderBy: [desc(schema.messages.createdAt)], limit: 100 }),
    db.select({ status: schema.messages.status, n: sql<number>`count(*)` }).from(schema.messages).groupBy(schema.messages.status),
  ]);
  const count = (s: string) => (s === "all" ? counts.reduce((a, c) => a + c.n, 0) : counts.find((c) => c.status === s)?.n ?? 0);
  return (
    <AdminPage title="Messages" description="From the contact page. Reply from your own mail client (the address link opens a reply), then mark it replied.">
      <FilterTabs items={STATUSES.map((s) => ({ href: `/admin/messages?status=${s}`, label: s, count: count(s), active: status === s }))} />
      <Rows>
        {rows.map((m) => (
          <Row
            key={m.id}
            actions={
              <>
                {m.status !== "replied" ? (
                  <form action={setStatus.bind(null, m.id, "replied")}>
                    <Button size="sm" variant="outline" type="submit">
                      Mark replied
                    </Button>
                  </form>
                ) : null}
                {m.status !== "archived" ? (
                  <form action={setStatus.bind(null, m.id, "archived")}>
                    <Button size="sm" variant="ghost" type="submit">
                      Archive
                    </Button>
                  </form>
                ) : null}
              </>
            }
          >
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {m.subject} <Status value={m.status} />
            </p>
            <p className="text-[13.5px] text-2">
              {m.name} ·{" "}
              <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} className="underline underline-offset-4">
                {m.email}
              </a>{" "}
              · {formatDate(m.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              {m.about ? ` · about ${m.about}` : ""}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[14.5px]">{m.body}</p>
          </Row>
        ))}
        {!rows.length ? <Empty>No {status === "all" ? "" : status} messages.</Empty> : null}
      </Rows>
    </AdminPage>
  );
}
