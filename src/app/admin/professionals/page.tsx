import { and, desc, eq, like, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, Empty, FilterTabs, Pager, Row, Rows, Status, Toolbar } from "@/components/admin";
import { Badge, Button } from "@/components/ui";
import { getProfession } from "@/content/professions";
import { getDb, schema } from "@/db";
import { formatDate, timeAgo } from "@/lib/format";
import { setProfessionalStatus, setProfessionalVerified } from "@/lib/professional-actions";

export const dynamic = "force-dynamic";
type Params = { status?: string; q?: string; page?: string };
const STATUSES = ["pending", "active", "hidden", "rejected", "all"] as const;
const PAGE = 50;

export default async function AdminProfessionals({ searchParams }: { searchParams: Promise<Params> }) {
  const { status = "pending", q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const db = await getDb();
  const conds = [];
  if (status !== "all") conds.push(eq(schema.professionals.status, status as (typeof schema.professionalStatus.enumValues)[number]));
  if (q) conds.push(like(schema.professionals.name, `%${q}%`));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total, counts] = await Promise.all([
    db.query.professionals.findMany({ where, orderBy: [desc(schema.professionals.createdAt)], limit: PAGE, offset: (pageNum - 1) * PAGE, with: { city: true, owner: { columns: { email: true, name: true } } } }),
    db.$count(schema.professionals, where),
    db.select({ status: schema.professionals.status, n: sql<number>`count(*)` }).from(schema.professionals).groupBy(schema.professionals.status),
  ]);
  const count = (s: string) => (s === "all" ? counts.reduce((a, c) => a + c.n, 0) : counts.find((c) => c.status === s)?.n ?? 0);
  const link = (p: Partial<Params>) => {
    const sp = new URLSearchParams();
    const merged = { status, q, ...p };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === "1")) sp.set(k, v);
    return `/admin/professionals?${sp.toString()}`;
  };

  return (
    <AdminPage title="Professionals" description="People's profiles: approve real people with a real profession, hide anything that reads like an advert or a fake, and mark verified only after checking the registration number and an identity document (the paid plan does this through Orders).">
      <FilterTabs items={STATUSES.map((s) => ({ href: link({ status: s, page: undefined }), label: s, count: count(s), active: status === s }))} />
      <Toolbar search={{ placeholder: "Search names…", defaultValue: q, hidden: { status } }} />
      <Rows>
        {rows.map((p) => {
          const prof = getProfession(p.professionSlug);
          return (
            <Row
              key={p.id}
              actions={
                <>
                  {p.status !== "active" ? (
                    <form action={setProfessionalStatus.bind(null, p.id, "active")}>
                      <Button size="sm" type="submit">
                        Approve
                      </Button>
                    </form>
                  ) : null}
                  {p.status === "active" ? (
                    <form action={setProfessionalVerified.bind(null, p.id, !p.isVerified)}>
                      <Button size="sm" variant="outline" type="submit">
                        {p.isVerified ? "Unverify" : "Mark verified"}
                      </Button>
                    </form>
                  ) : null}
                  {p.status === "active" ? (
                    <form action={setProfessionalStatus.bind(null, p.id, "hidden")}>
                      <Button size="sm" variant="ghost" type="submit">
                        Hide
                      </Button>
                    </form>
                  ) : null}
                  {p.status === "pending" ? (
                    <form action={setProfessionalStatus.bind(null, p.id, "rejected")}>
                      <Button size="sm" variant="ghost" type="submit">
                        Reject
                      </Button>
                    </form>
                  ) : null}
                </>
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/professional/${p.id}`} className="font-medium hover:underline underline-offset-4">
                  {p.name}
                </Link>
                {p.status === "active" ? (
                  <Link href={`/p/${p.slug}`} className="text-[12px] text-3 hover:text-[var(--text)]" target="_blank">
                    view ↗
                  </Link>
                ) : null}
                <Status value={p.status} />
                {p.isVerified ? <Badge tone="success">verified</Badge> : null}
              </div>
              <p className="mt-0.5 text-[13.5px] text-2">
                {[prof?.name ?? p.professionSlug, p.city?.name, p.phone, p.email].filter(Boolean).join(" · ")} · added {timeAgo(p.createdAt)}
                {p.owner ? ` · account ${p.owner.email}` : ""}
              </p>
              {p.headline ? <p className="mt-1 text-[13.5px]">{p.headline}</p> : null}
              <p className="mt-1 text-[12.5px] text-3">
                {[p.licenceNo && prof?.licence ? `${prof.licence.body} ${p.licenceNo}` : null, p.yearsExperience ? `${p.yearsExperience} yrs` : null, p.cvUrl ? "CV attached" : null, p.website ? p.website.replace(/^https?:\/\//, "") : null, p.verifiedAt ? `verified ${formatDate(p.verifiedAt)}` : null].filter(Boolean).join(" · ")}
              </p>
            </Row>
          );
        })}
        {!rows.length ? <Empty>{q ? `Nothing matches “${q}”.` : `No ${status === "all" ? "" : status} profiles.`}</Empty> : null}
      </Rows>
      <Pager page={pageNum} pageSize={PAGE} total={total} href={(p) => link({ page: String(p) })} />
    </AdminPage>
  );
}
