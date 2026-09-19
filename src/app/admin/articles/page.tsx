import { and, desc, eq, like, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, EmptyRow, FilterTabs, Pager, Status, SubFilter, Table, TBody, Td, THead, Toolbar } from "@/components/admin";
import { ButtonLink } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDate, timeAgo } from "@/lib/format";

type Params = { status?: string; kind?: string; q?: string; page?: string };
const STATUSES = ["all", "draft", "research", "editing", "fact_check", "scheduled", "published", "archived"] as const;
const PAGE = 50;

export default async function AdminArticles({ searchParams }: { searchParams: Promise<Params> }) {
  const { status = "all", kind = "all", q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const db = await getDb();
  const conds = [];
  if (status !== "all") conds.push(eq(schema.articles.status, status as (typeof schema.articleStatus.enumValues)[number]));
  if (kind !== "all") conds.push(eq(schema.articles.kind, kind as (typeof schema.articleKind.enumValues)[number]));
  if (q) conds.push(like(schema.articles.title, `%${q}%`));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total, counts] = await Promise.all([
    db.query.articles.findMany({ where, orderBy: [desc(schema.articles.updatedAt)], limit: PAGE, offset: (pageNum - 1) * PAGE, with: { category: true, author: true } }),
    db.$count(schema.articles, where),
    db.select({ status: schema.articles.status, n: sql<number>`count(*)` }).from(schema.articles).where(kind !== "all" ? eq(schema.articles.kind, kind as "news") : undefined).groupBy(schema.articles.status),
  ]);
  const count = (s: string) => (s === "all" ? counts.reduce((a, c) => a + c.n, 0) : counts.find((c) => c.status === s)?.n ?? 0);
  const link = (p: Partial<Params>) => {
    const sp = new URLSearchParams();
    const merged = { status, kind, q, ...p };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all" && !(k === "page" && v === "1")) sp.set(k, v);
    const s = sp.toString();
    return `/admin/articles${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPage
      title="Articles"
      description="News leads with the number; guides answer one question completely. Drafts move through research, editing and fact check before they are scheduled."
      actions={
        <>
          <ButtonLink href="/admin/articles/new?kind=news" size="sm">
            + Story
          </ButtonLink>
          <ButtonLink href="/admin/articles/new?kind=guide" size="sm" variant="outline">
            + Guide
          </ButtonLink>
        </>
      }
    >
      <FilterTabs items={STATUSES.filter((s) => s === "all" || count(s) || s === status).map((s) => ({ href: link({ status: s, page: undefined }), label: s.replace("_", " "), count: count(s), active: status === s }))} />
      <Toolbar search={{ placeholder: "Search titles…", defaultValue: q, hidden: { status: status !== "all" ? status : undefined, kind: kind !== "all" ? kind : undefined } }}>
        <SubFilter label="Kind" items={["all", "news", "guide"].map((k) => ({ href: link({ kind: k, page: undefined }), label: k, active: kind === k }))} />
      </Toolbar>
      <Table>
        <THead cols={["Title", "Kind", "Category", "Status", { label: "Views", align: "right" }, "Updated"]} />
        <TBody>
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-surface-2">
              <Td className="max-w-lg">
                <Link href={`/admin/articles/${a.id}`} className="font-medium hover:underline underline-offset-4">
                  {a.title}
                </Link>
                {a.status === "scheduled" && a.scheduledFor ? <span className="block text-[12.5px] text-3">goes live {formatDate(a.scheduledFor, { dateStyle: "medium", timeStyle: "short" })}</span> : null}
                {a.author ? <span className="block text-[12.5px] text-3">{a.author.name}</span> : null}
              </Td>
              <Td muted>{a.kind}</Td>
              <Td muted>{a.category?.name ?? "-"}</Td>
              <Td>
                <Status value={a.status} />
              </Td>
              <Td align="right" muted>
                {a.viewCount.toLocaleString()}
              </Td>
              <Td muted className="whitespace-nowrap text-[13px]">
                {timeAgo(a.updatedAt)}
              </Td>
            </tr>
          ))}
          {!rows.length ? <EmptyRow colSpan={6}>{q ? `Nothing matches “${q}”.` : "Nothing here yet."}</EmptyRow> : null}
        </TBody>
      </Table>
      <Pager page={pageNum} pageSize={PAGE} total={total} href={(p) => link({ page: String(p) })} />
    </AdminPage>
  );
}
