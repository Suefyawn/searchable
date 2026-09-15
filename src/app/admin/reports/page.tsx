import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { resolveReport } from "@/lib/report-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function targetLink(type: string, id: string) {
  const db = await getDb();
  if (type === "business") {
    const b = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, id), columns: { name: true, slug: true } });
    return b ? { label: b.name, href: `/admin/businesses/${id}` } : null;
  }
  if (type === "article") {
    const a = await db.query.articles.findFirst({ where: eq(schema.articles.id, id), columns: { title: true } });
    return a ? { label: a.title, href: `/admin/articles/${id}` } : null;
  }
  const r = await db.query.businessReviews.findFirst({ where: eq(schema.businessReviews.id, id), columns: { title: true, body: true } });
  return r ? { label: `Review: ${r.title ?? r.body?.slice(0, 60)}`, href: `/admin/reviews?status=all` } : null;
}

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "open" } = await searchParams;
  const db = await getDb();
  const rows = await db.query.reports.findMany({ where: status === "all" ? undefined : eq(schema.reports.status, status as "open"), orderBy: [desc(schema.reports.createdAt)], limit: 100 });
  const targets = await Promise.all(rows.map((r) => targetLink(r.targetType, r.targetId)));
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Reports</h1>
      <div className="mb-4 flex gap-1">
        {["open", "resolved", "dismissed", "all"].map((s) => (
          <Link key={s} href={`/admin/reports?status=${s}`} className={cn("px-2.5 py-1.5 text-sm capitalize", status === s ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2")}>
            {s}
          </Link>
        ))}
      </div>
      <div className="divide-y divide-[var(--border)] border-y border-line">
        {rows.map((r, i) => (
          <div key={r.id} className="flex flex-wrap items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <Badge tone={r.status === "open" ? "warning" : "neutral"}>{r.status}</Badge>
                <span className="ml-2 font-medium capitalize">{r.targetType}</span>
                <span className="ml-2 text-2">· {r.reason.replace("_", " ")}</span>
              </p>
              {targets[i] ? (
                <Link href={targets[i]!.href} className="mt-1 block font-medium hover:text-brand-700">
                  {targets[i]!.label}
                </Link>
              ) : (
                <p className="mt-1 text-sm text-3">Target no longer exists</p>
              )}
              {r.details ? <p className="mt-1 text-[15px] text-2">{r.details}</p> : null}
              <p className="mt-1 text-xs text-3">
                {r.reporterEmail ?? "anonymous"} · {formatDate(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
            {r.status === "open" ? (
              <div className="flex gap-1.5">
                <form action={resolveReport.bind(null, r.id, "resolved")}>
                  <Button size="sm" type="submit">Resolved</Button>
                </form>
                <form action={resolveReport.bind(null, r.id, "dismissed")}>
                  <Button size="sm" variant="ghost" type="submit">Dismiss</Button>
                </form>
              </div>
            ) : null}
          </div>
        ))}
        {!rows.length ? <p className="py-8 text-center text-2">No {status === "all" ? "" : status} reports.</p> : null}
      </div>
    </div>
  );
}
