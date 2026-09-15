import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, Empty, FilterTabs, Row, Rows, Status } from "@/components/admin";
import { Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { moderateReview } from "@/lib/review-actions";

export const dynamic = "force-dynamic";
const STATUSES = ["pending", "published", "hidden", "all"] as const;

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "pending" } = await searchParams;
  const db = await getDb();
  const [rows, counts] = await Promise.all([
    db.query.businessReviews.findMany({
      where: status === "all" ? undefined : eq(schema.businessReviews.status, status as (typeof schema.reviewStatus.enumValues)[number]),
      orderBy: [desc(schema.businessReviews.createdAt)],
      limit: 100,
      with: { business: true },
    }),
    db.select({ status: schema.businessReviews.status, n: sql<number>`count(*)::int` }).from(schema.businessReviews).groupBy(schema.businessReviews.status),
  ]);
  const count = (s: string) => (s === "all" ? counts.reduce((a, c) => a + c.n, 0) : counts.find((c) => c.status === s)?.n ?? 0);
  return (
    <AdminPage title="Reviews" description="Publish what reads like a real visit. Hide spam, insults, and anything naming private people. Owners can reply to published reviews from their dashboard.">
      <FilterTabs items={STATUSES.map((s) => ({ href: `/admin/reviews?status=${s}`, label: s, count: count(s), active: status === s }))} />
      <Rows>
        {rows.map((r) => (
          <Row
            key={r.id}
            actions={
              <>
                {r.status !== "published" ? (
                  <form action={moderateReview.bind(null, r.id, "published")}>
                    <Button size="sm" type="submit">
                      Publish
                    </Button>
                  </form>
                ) : null}
                {r.status !== "hidden" ? (
                  <form action={moderateReview.bind(null, r.id, "hidden")}>
                    <Button size="sm" variant="ghost" type="submit">
                      Hide
                    </Button>
                  </form>
                ) : null}
              </>
            }
          >
            <p className="flex flex-wrap items-center gap-2 text-[14px]">
              <Link href={`/b/${r.business.slug}`} className="font-medium hover:underline underline-offset-4">
                {r.business.name}
              </Link>
              <span aria-label={`${r.rating} out of 5`} className="tracking-tight">
                {"★".repeat(r.rating)}
                <span className="text-ink-300">{"★".repeat(5 - r.rating)}</span>
              </span>
              <Status value={r.status} />
              <span className="text-[12.5px] text-3">
                {r.authorName ?? "Anonymous"} · {formatDate(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </p>
            {r.title ? <p className="mt-1 font-medium">{r.title}</p> : null}
            <p className="mt-0.5 text-[14.5px]">{r.body}</p>
          </Row>
        ))}
        {!rows.length ? <Empty>No {status === "all" ? "" : status} reviews.</Empty> : null}
      </Rows>
    </AdminPage>
  );
}
