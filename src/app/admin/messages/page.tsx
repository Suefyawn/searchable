import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function setStatus(id: string, status: string) {
  "use server";
  await requireRole("editor");
  const db = await getDb();
  await db.update(schema.messages).set({ status }).where(eq(schema.messages.id, id));
  revalidatePath("/admin/messages");
}

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "new" } = await searchParams;
  const db = await getDb();
  const rows = await db.query.messages.findMany({ where: status === "all" ? undefined : eq(schema.messages.status, status), orderBy: [desc(schema.messages.createdAt)], limit: 100 });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Messages</h1>
      <div className="mb-4 flex gap-1">
        {["new", "replied", "archived", "all"].map((s) => (
          <Link key={s} href={`/admin/messages?status=${s}`} className={cn("px-2.5 py-1.5 text-sm capitalize", status === s ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2")}>
            {s}
          </Link>
        ))}
      </div>
      <div className="divide-y divide-[var(--border)] border-y border-line">
        {rows.map((m) => (
          <div key={m.id} className="flex flex-wrap items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {m.subject} <Badge tone={m.status === "new" ? "warning" : "neutral"} className="ml-2">{m.status}</Badge>
              </p>
              <p className="text-sm text-2">
                {m.name} · <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} className="underline underline-offset-4">{m.email}</a> · {formatDate(m.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                {m.about ? ` · about ${m.about}` : ""}
              </p>
              <p className="mt-1.5 whitespace-pre-line text-[15px]">{m.body}</p>
            </div>
            <div className="flex gap-1.5">
              {m.status !== "replied" ? (
                <form action={setStatus.bind(null, m.id, "replied")}>
                  <Button size="sm" variant="outline" type="submit">Mark replied</Button>
                </form>
              ) : null}
              {m.status !== "archived" ? (
                <form action={setStatus.bind(null, m.id, "archived")}>
                  <Button size="sm" variant="ghost" type="submit">Archive</Button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
        {!rows.length ? <p className="py-8 text-center text-2">No {status === "all" ? "" : status} messages.</p> : null}
      </div>
    </div>
  );
}
