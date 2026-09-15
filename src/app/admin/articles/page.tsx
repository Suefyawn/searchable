import { and, desc, eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { Badge, ButtonLink, Input } from "@/components/ui";
import { getDb, schema } from "@/db";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type Params = { status?: string; kind?: string; q?: string };
const STATUSES = ["all", "draft", "published", "archived"];

export default async function AdminArticles({ searchParams }: { searchParams: Promise<Params> }) {
  const { status = "all", kind = "all", q = "" } = await searchParams;
  const db = await getDb();
  const conds = [];
  if (status !== "all") conds.push(eq(schema.articles.status, status as typeof schema.articleStatus.enumValues[number]));
  if (kind !== "all") conds.push(eq(schema.articles.kind, kind as typeof schema.articleKind.enumValues[number]));
  if (q) conds.push(ilike(schema.articles.title, `%${q}%`));
  const rows = await db.query.articles.findMany({ where: conds.length ? and(...conds) : undefined, orderBy: [desc(schema.articles.updatedAt)], limit: 100, with: { category: true, author: true } });

  const link = (p: Partial<Params>) => {
    const sp = new URLSearchParams({ status, kind, q, ...p });
    return `/admin/articles?${sp.toString()}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Articles</h1>
        <div className="flex gap-2">
          <ButtonLink href="/admin/articles/new?kind=news" size="sm">
            + News
          </ButtonLink>
          <ButtonLink href="/admin/articles/new?kind=guide" size="sm" variant="outline">
            + Guide
          </ButtonLink>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={link({ status: s })} className={cn("rounded-full border px-3 py-1 text-sm", status === s ? "border-brand-600 bg-brand-700 text-white" : "border-line bg-surface text-2")}>
            {s}
          </Link>
        ))}
        <span className="mx-1 text-3">·</span>
        {["all", "news", "guide"].map((k) => (
          <Link key={k} href={link({ kind: k })} className={cn("rounded-full border px-3 py-1 text-sm", kind === k ? "border-brand-600 bg-brand-700 text-white" : "border-line bg-surface text-2")}>
            {k}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="kind" value={kind} />
          <Input name="q" defaultValue={q} placeholder="Search titles…" className="h-9 w-56 text-sm" />
        </form>
      </div>
      <div className="surface overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead className="text-left text-xs uppercase tracking-wider text-3">
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Kind</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Views</th>
              <th className="px-4 py-2.5 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((a) => (
              <tr key={a.id} className="hover:bg-surface-2">
                <td className="max-w-md px-4 py-2.5">
                  <Link href={`/admin/articles/${a.id}`} className="font-medium hover:text-brand-700">
                    {a.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-2">{a.kind}</td>
                <td className="px-4 py-2.5 text-2">{a.category?.name ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={a.status === "published" ? "success" : a.status === "draft" ? "neutral" : "warning"}>{a.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right tabular text-2">{a.viewCount}</td>
                <td className="px-4 py-2.5 text-sm text-3">{timeAgo(a.updatedAt)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-2">
                  Nothing here yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
