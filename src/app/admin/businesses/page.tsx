import { and, desc, eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { Badge, Button, Input } from "@/components/ui";
import { getDb, schema } from "@/db";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setBusinessStatus, setBusinessVerified } from "./actions";

type Params = { status?: string; q?: string };
const STATUSES = ["pending", "active", "closed", "rejected", "all"];

export default async function AdminBusinesses({ searchParams }: { searchParams: Promise<Params> }) {
  const { status = "pending", q = "" } = await searchParams;
  const db = await getDb();
  const conds = [];
  if (status !== "all") conds.push(eq(schema.businesses.status, status as (typeof schema.businessStatus.enumValues)[number]));
  if (q) conds.push(ilike(schema.businesses.name, `%${q}%`));
  const rows = await db.query.businesses.findMany({ where: conds.length ? and(...conds) : undefined, orderBy: [desc(schema.businesses.createdAt)], limit: 100, with: { primaryCategory: true, city: true } });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Businesses</h1>
        <Link href="/add-business" className="text-sm font-medium text-brand-700 dark:text-brand-300">
          + Add business
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/businesses?status=${s}`} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-sm transition-colors capitalize", status === s ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2 hover:text-[var(--text)]")}>
            {s}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="status" value={status} />
          <Input name="q" defaultValue={q} placeholder="Search names…" className="h-9 w-56 text-sm" />
        </form>
      </div>
      <div className="surface divide-y divide-[var(--border)]">
        {rows.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/businesses/${b.id}`} className="font-medium hover:text-brand-700">
                  {b.name}
                </Link>
                <Link href={`/b/${b.slug}`} className="text-xs text-3 hover:text-brand-700" target="_blank">view ↗</Link>
                <Badge tone={b.status === "active" ? "success" : b.status === "pending" ? "warning" : "neutral"}>{b.status}</Badge>
                {b.isVerified ? <Badge tone="brand">verified</Badge> : null}
              </div>
              <p className="text-sm text-2">
                {[b.primaryCategory?.name, b.city?.name, b.phone].filter(Boolean).join(" · ")} · added {timeAgo(b.createdAt)}
              </p>
              {b.status === "pending" && b.description ? <p className="mt-1 line-clamp-2 text-sm text-3">{b.description}</p> : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {b.status !== "active" ? (
                <form action={setBusinessStatus.bind(null, b.id, "active")}>
                  <Button size="sm" type="submit">
                    Approve
                  </Button>
                </form>
              ) : null}
              {b.status === "active" ? (
                <form action={setBusinessVerified.bind(null, b.id, !b.isVerified)}>
                  <Button size="sm" variant="outline" type="submit">
                    {b.isVerified ? "Unverify" : "Mark verified"}
                  </Button>
                </form>
              ) : null}
              {b.status === "active" ? (
                <form action={setBusinessStatus.bind(null, b.id, "closed")}>
                  <Button size="sm" variant="ghost" type="submit">
                    Close
                  </Button>
                </form>
              ) : null}
              {b.status === "pending" ? (
                <form action={setBusinessStatus.bind(null, b.id, "rejected")}>
                  <Button size="sm" variant="ghost" type="submit">
                    Reject
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
        {!rows.length ? <p className="px-4 py-8 text-center text-2">Nothing {status === "all" ? "" : status} here.</p> : null}
      </div>
    </div>
  );
}
