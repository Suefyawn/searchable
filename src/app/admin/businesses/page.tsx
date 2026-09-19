import { and, desc, eq, like, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, Empty, FilterTabs, Pager, Row, Rows, Status, SubFilter, Toolbar } from "@/components/admin";
import { Badge, Button, ButtonLink } from "@/components/ui";
import { getDb, schema } from "@/db";
import { timeAgo } from "@/lib/format";
import { setBusinessStatus, setBusinessVerified } from "./actions";

type Params = { status?: string; q?: string; claim?: string; page?: string };
const STATUSES = ["pending", "active", "closed", "rejected", "duplicate", "all"] as const;
const PAGE = 50;

export default async function AdminBusinesses({ searchParams }: { searchParams: Promise<Params> }) {
  const { status = "pending", q = "", claim = "all", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const db = await getDb();
  const conds = [];
  if (status !== "all") conds.push(eq(schema.businesses.status, status as (typeof schema.businessStatus.enumValues)[number]));
  if (q) conds.push(like(schema.businesses.name, `%${q}%`));
  if (claim === "claimed") conds.push(sql`(${schema.businesses.claimedAt} is not null or ${schema.businesses.ownerUserId} is not null)`);
  if (claim === "unclaimed") conds.push(and(isNull(schema.businesses.claimedAt), isNull(schema.businesses.ownerUserId))!);
  if (claim === "verified") conds.push(eq(schema.businesses.isVerified, true));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total, counts] = await Promise.all([
    db.query.businesses.findMany({ where, orderBy: [desc(schema.businesses.createdAt)], limit: PAGE, offset: (pageNum - 1) * PAGE, with: { primaryCategory: true, city: true } }),
    db.$count(schema.businesses, where),
    db.select({ status: schema.businesses.status, n: sql<number>`count(*)` }).from(schema.businesses).groupBy(schema.businesses.status),
  ]);
  const count = (s: string) => (s === "all" ? counts.reduce((a, c) => a + c.n, 0) : counts.find((c) => c.status === s)?.n ?? 0);
  const link = (p: Partial<Params>) => {
    const sp = new URLSearchParams();
    const merged = { status, q, claim, ...p };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all" && !(k === "page" && v === "1")) sp.set(k, v);
    const s = sp.toString();
    return `/admin/businesses${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPage
      title="Businesses"
      description="Approve new listings, mark duplicates, and see who has claimed what. Verified is granted by a paid plan (Orders) or by hand here after you have checked the business yourself."
      actions={
        <>
          <ButtonLink href="/admin/businesses/import" size="sm" variant="outline">
            Import CSV
          </ButtonLink>
          <ButtonLink href="/add-business" size="sm">
            + Add business
          </ButtonLink>
        </>
      }
    >
      <FilterTabs items={STATUSES.map((s) => ({ href: link({ status: s, page: undefined }), label: s, count: count(s), active: status === s }))} />
      <Toolbar search={{ placeholder: "Search names…", defaultValue: q, hidden: { status, claim: claim !== "all" ? claim : undefined } }}>
        <SubFilter label="Ownership" items={["all", "unclaimed", "claimed", "verified"].map((c) => ({ href: link({ claim: c, page: undefined }), label: c, active: claim === c }))} />
      </Toolbar>
      <Rows>
        {rows.map((b) => (
          <Row
            key={b.id}
            actions={
              <>
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
              </>
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/admin/businesses/${b.id}`} className="font-medium hover:underline underline-offset-4">
                {b.name}
              </Link>
              <Link href={`/b/${b.slug}`} className="text-[12px] text-3 hover:text-[var(--text)]" target="_blank">
                view ↗
              </Link>
              <Status value={b.status} />
              {b.isVerified ? <Badge tone="success">verified</Badge> : null}
              {b.tier === "premium" || b.tier === "sponsored" ? <Badge>{b.tier}</Badge> : null}
              {b.claimedAt || b.ownerUserId ? <Badge>claimed</Badge> : <Badge tone="neutral">unclaimed</Badge>}
            </div>
            <p className="mt-0.5 text-[13.5px] text-2">
              {[b.primaryCategory?.name, b.city?.name, b.phone, b.email].filter(Boolean).join(" · ")} · added {timeAgo(b.createdAt)}
              {b.claimInviteSentAt ? ` · invited ${timeAgo(b.claimInviteSentAt)}` : ""}
            </p>
            {b.status === "pending" && b.description ? <p className="mt-1 line-clamp-2 text-[13.5px] text-3">{b.description}</p> : null}
          </Row>
        ))}
        {!rows.length ? <Empty>{q ? `Nothing matches “${q}”.` : `Nothing ${status === "all" ? "" : status} here.`}</Empty> : null}
      </Rows>
      <Pager page={pageNum} pageSize={PAGE} total={total} href={(p) => link({ page: String(p) })} />
    </AdminPage>
  );
}
