import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, Empty, FilterTabs, Pager, Row, Rows, Status, Toolbar } from "@/components/admin";
import { ButtonLink, Select } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { ActionForm } from "./action-form";
import { setUserRole } from "./actions";

export const dynamic = "force-dynamic";
type Params = { role?: string; q?: string; page?: string };
const ROLES = ["all", "user", "business_owner", "editor", "admin"] as const;
const PAGE = 50;

/** Every account on the site: who they are, what they own, and their role, changeable in place. */
export default async function AdminUsers({ searchParams }: { searchParams: Promise<Params> }) {
  const me = await requireRole("admin");
  const { role = "all", q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const db = await getDb();
  const conds = [];
  if (role !== "all") conds.push(eq(schema.users.role, role as (typeof schema.userRole.enumValues)[number]));
  if (q) conds.push(or(ilike(schema.users.name, `%${q}%`), ilike(schema.users.email, `%${q}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total, counts] = await Promise.all([
    db
      // Correlated subqueries: the outer column is written as ${schema.users}."id" because a bare column in a
      // select-list fragment renders unqualified ("id") and would bind to the inner table.
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        emailVerified: schema.users.emailVerified,
        createdAt: schema.users.createdAt,
        lastSeen: sql<string | null>`(select max(updated_at)::text from sessions s where s.user_id = ${schema.users}."id")`,
        businesses: sql<number>`(select count(*) from businesses b where b.owner_user_id = ${schema.users}."id")::int`,
        professionals: sql<number>`(select count(*) from professionals p where p.owner_user_id = ${schema.users}."id")::int`,
        posts: sql<number>`(select count(*) from posts p where p.author_id = ${schema.users}."id")::int`,
        banned: sql<boolean>`coalesce((select m.is_banned from member_profiles m where m.user_id = ${schema.users}."id"), false)`,
      })
      .from(schema.users)
      .where(where)
      .orderBy(desc(schema.users.createdAt))
      .limit(PAGE)
      .offset((pageNum - 1) * PAGE),
    db.$count(schema.users, where),
    db.select({ role: schema.users.role, n: sql<number>`count(*)::int` }).from(schema.users).groupBy(schema.users.role),
  ]);
  const count = (r: string) => (r === "all" ? counts.reduce((a, c) => a + c.n, 0) : counts.find((c) => c.role === r)?.n ?? 0);
  const link = (p: Partial<Params>) => {
    const sp = new URLSearchParams();
    const merged = { role, q, ...p };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all" && !(k === "page" && v === "1")) sp.set(k, v);
    const s = sp.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPage
      title="Users"
      description="Every account: readers, business owners, editors and admins. Change a role here; open an account to edit it, set a password, sign it out everywhere, ban it from the community or delete it."
      actions={
        <ButtonLink href="/admin/users/new" size="sm">
          + Add user
        </ButtonLink>
      }
    >
      <FilterTabs items={ROLES.map((r) => ({ href: link({ role: r, page: "1" }), label: r.replace("_", " "), count: count(r), active: role === r }))} />
      <Toolbar search={{ placeholder: "Name or email", defaultValue: q, hidden: { role: role !== "all" ? role : undefined } }} />
      <Rows>
        {rows.length ? (
          rows.map((u) => (
            <Row
              key={u.id}
              actions={
                <ActionForm action={setUserRole.bind(null, u.id)} submit="Set" size="sm" variant="outline" inline>
                  <Select key={u.role} name="role" defaultValue={u.role} aria-label={`Role for ${u.email}`} className="h-8 text-[13px]" disabled={u.id === me.id}>
                    {ROLES.filter((r) => r !== "all").map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </Select>
                </ActionForm>
              }
            >
              <p className="flex flex-wrap items-center gap-2 text-[14.5px]">
                <Link href={`/admin/users/${u.id}`} className="font-medium underline-offset-4 hover:underline">
                  {u.name}
                </Link>
                <span className="text-2">{u.email}</span>
                <Status value={u.role} />
                {u.id === me.id ? <span className="text-[12px] text-3">you</span> : null}
                {u.banned ? <Status value="banned" /> : null}
                {!u.emailVerified ? <span className="text-[12px] text-3">unverified</span> : null}
              </p>
              <p className="mt-1 text-[13px] text-3">
                Joined {timeAgo(u.createdAt)}
                {u.lastSeen ? ` · last seen ${timeAgo(u.lastSeen)}` : " · never signed in"}
                {u.businesses ? ` · ${u.businesses} business${u.businesses === 1 ? "" : "es"}` : ""}
                {u.professionals ? ` · professional profile` : ""}
                {u.posts ? ` · ${u.posts} post${u.posts === 1 ? "" : "s"}` : ""}
              </p>
            </Row>
          ))
        ) : (
          <Empty>No accounts match.</Empty>
        )}
      </Rows>
      <Pager page={pageNum} pageSize={PAGE} total={total} href={(n) => link({ page: String(n) })} />
    </AdminPage>
  );
}
