import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, Empty, FilterTabs, Row, Rows, Status } from "@/components/admin";
import { Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { resolveReport } from "@/lib/report-actions";

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
  if (type === "post") {
    const p = await db.query.posts.findFirst({ where: eq(schema.posts.id, id), columns: { title: true, slug: true } });
    return p ? { label: `Post: ${p.title}`, href: `/community/post/${p.slug}` } : null;
  }
  if (type === "comment") {
    const c = await db.query.comments.findFirst({ where: eq(schema.comments.id, id), columns: { body: true } });
    return c ? { label: `Comment: ${c.body.slice(0, 80)}`, href: `/admin/community?view=comments` } : null;
  }
  if (type === "member") {
    const m = await db.query.memberProfiles.findFirst({ where: eq(schema.memberProfiles.userId, id), columns: { handle: true, displayName: true } });
    return m ? { label: `Member: ${m.displayName} (@${m.handle})`, href: `/admin/community?view=members` } : null;
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
    <AdminPage title="Reports" description="Readers flagging wrong details, closed businesses, spam reviews or errors in articles. Fix the target first, then mark the report resolved.">
      <FilterTabs items={["open", "resolved", "dismissed", "all"].map((s) => ({ href: `/admin/reports?status=${s}`, label: s, active: status === s }))} />
      <Rows>
        {rows.map((r, i) => (
          <Row
            key={r.id}
            actions={
              r.status === "open" ? (
                <>
                  <form action={resolveReport.bind(null, r.id, "resolved")}>
                    <Button size="sm" type="submit">
                      Resolved
                    </Button>
                  </form>
                  <form action={resolveReport.bind(null, r.id, "dismissed")}>
                    <Button size="sm" variant="ghost" type="submit">
                      Dismiss
                    </Button>
                  </form>
                </>
              ) : null
            }
          >
            <p className="flex flex-wrap items-center gap-2 text-[14px]">
              <Status value={r.status} />
              <span className="font-medium capitalize">{r.targetType}</span>
              <span className="text-2">· {r.reason.replace("_", " ")}</span>
            </p>
            {targets[i] ? (
              <Link href={targets[i]!.href} className="mt-1 block font-medium hover:underline underline-offset-4">
                {targets[i]!.label}
              </Link>
            ) : (
              <p className="mt-1 text-[13.5px] text-3">Target no longer exists</p>
            )}
            {r.details ? <p className="mt-1 text-[14.5px] text-2">{r.details}</p> : null}
            <p className="mt-1 text-[12.5px] text-3">
              {r.reporterEmail ?? "anonymous"} · {formatDate(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </Row>
        ))}
        {!rows.length ? <Empty>No {status === "all" ? "" : status} reports.</Empty> : null}
      </Rows>
    </AdminPage>
  );
}
