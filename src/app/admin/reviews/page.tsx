import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { moderateReview } from "@/lib/review-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "pending" } = await searchParams;
  const db = await getDb();
  const rows = await db.query.businessReviews.findMany({
    where: status === "all" ? undefined : eq(schema.businessReviews.status, status as (typeof schema.reviewStatus.enumValues)[number]),
    orderBy: [desc(schema.businessReviews.createdAt)],
    limit: 100,
    with: { business: true },
  });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Reviews</h1>
      <div className="mb-4 flex gap-2">
        {["pending", "published", "hidden", "all"].map((s) => (
          <Link key={s} href={`/admin/reviews?status=${s}`} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors capitalize", status === s ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "bg-surface-2 text-2 hover:bg-surface-3 hover:text-[var(--text)]")}>
            {s}
          </Link>
        ))}
      </div>
      <div className="surface divide-y divide-[var(--border)]">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <Link href={`/b/${r.business.slug}`} className="font-medium hover:text-brand-700">{r.business.name}</Link>
                <span className="ml-2 text-accent-700">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <Badge className="ml-2" tone={r.status === "published" ? "success" : r.status === "pending" ? "warning" : "neutral"}>{r.status}</Badge>
              </p>
              <p className="text-sm text-2">{r.authorName ?? "Anonymous"} · {formatDate(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
              {r.title ? <p className="mt-1 font-medium">{r.title}</p> : null}
              <p className="mt-0.5 text-[15px]">{r.body}</p>
            </div>
            <div className="flex gap-1.5">
              {r.status !== "published" ? (
                <form action={moderateReview.bind(null, r.id, "published")}>
                  <Button size="sm" type="submit">Publish</Button>
                </form>
              ) : null}
              {r.status !== "hidden" ? (
                <form action={moderateReview.bind(null, r.id, "hidden")}>
                  <Button size="sm" variant="ghost" type="submit">Hide</Button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
        {!rows.length ? <p className="px-4 py-8 text-center text-2">No {status === "all" ? "" : status} reviews.</p> : null}
      </div>
    </div>
  );
}
