import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Badge, Button, Textarea } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { convertSubmissionAction, setSubmissionStatusAction } from "@/lib/commerce-actions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const TONE = { new: "warning", reviewing: "brand", accepted: "success", rejected: "danger", published: "success" } as const;
const STATUSES = ["new", "reviewing", "accepted", "rejected", "published"] as const;

export default async function AdminSubmissions({ searchParams }: { searchParams: Promise<{ status?: string; open?: string }> }) {
  await requireRole("editor");
  const { status, open } = await searchParams;
  const db = await getDb();
  const rows = await db.query.submissions.findMany({
    where: status ? eq(schema.submissions.status, status as "new") : undefined,
    orderBy: [desc(schema.submissions.createdAt)],
    limit: 100,
    with: { order: { columns: { invoiceNo: true, status: true } }, article: { columns: { id: true, slug: true, status: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Guest & sponsored submissions</h1>
      <p className="mb-6 text-sm text-2">Pitches from /write-for-us. Sponsored and press-release submissions carry an invoice; convert to a draft once paid (or once you accept a free guest piece).</p>
      <nav className="mb-4 flex gap-1 border-y border-line py-1.5 text-sm">
        {["", ...STATUSES].map((s) => (
          <Link key={s} href={s ? `/admin/submissions?status=${s}` : "/admin/submissions"} className={`px-2.5 py-1.5 ${(status ?? "") === s ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2"}`}>
            {s || "All"}
          </Link>
        ))}
      </nav>
      <div className="divide-y divide-[var(--border)] border-y border-line">
        {rows.map((s) => (
          <article key={s.id} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone={TONE[s.status]}>{s.status}</Badge>
                  <Badge>{s.kind.replace("_", " ")}</Badge>
                  <span className="text-3">{formatDate(s.createdAt)}</span>
                  {s.order ? (
                    <Link href={`/orders/${s.order.invoiceNo}`} className="underline-offset-4 hover:underline">
                      {s.order.invoiceNo} · {s.order.status}
                    </Link>
                  ) : null}
                  {s.article ? (
                    <Link href={`/admin/articles/${s.article.id}`} className="underline-offset-4 hover:underline">
                      draft article · {s.article.status}
                    </Link>
                  ) : null}
                </p>
                <h2 className="mt-1 font-serif text-xl">{s.title}</h2>
                <p className="text-sm text-2">
                  {s.name}{s.company ? `, ${s.company}` : ""} · <a href={`mailto:${s.email}`} className="underline-offset-4 hover:underline">{s.email}</a>{s.phone ? ` · ${s.phone}` : ""}{s.website ? ` · ${s.website}` : ""}{s.category ? ` · ${s.category}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/submissions?${status ? `status=${status}&` : ""}open=${open === s.id ? "" : s.id}`} className="inline-flex h-8 items-center border border-line px-3 text-sm hover:bg-surface-2">
                  {open === s.id ? "Hide text" : "Read"}
                </Link>
                {!s.articleId ? (
                  <form action={convertSubmissionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button size="sm" type="submit" disabled={s.kind !== "guest" && s.order?.status === "pending"} title={s.kind !== "guest" && s.order?.status === "pending" ? "Waiting for payment" : undefined}>
                      Convert to draft
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
            {open === s.id ? (
              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap border border-line bg-surface-2 p-4 font-sans text-[14px] leading-relaxed">{s.body}</pre>
                <form action={setSubmissionStatusAction} className="space-y-2 border border-line p-3 text-sm">
                  <input type="hidden" name="id" value={s.id} />
                  {s.links.length ? (
                    <p className="text-xs text-2">
                      Links requested:{" "}
                      {s.links.map((l) => (
                        <a key={l.url} href={l.url} rel="nofollow noopener" target="_blank" className="underline-offset-4 hover:underline">
                          {l.url}
                        </a>
                      ))}
                    </p>
                  ) : null}
                  <label className="block text-xs text-3">
                    Status
                    <select name="status" defaultValue={s.status} className="mt-1 block h-9 w-full border border-line bg-surface px-2 text-sm">
                      {STATUSES.map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-3">
                    Editor notes
                    <Textarea name="editorNotes" defaultValue={s.editorNotes ?? ""} className="mt-1 min-h-24 text-sm" />
                  </label>
                  <Button size="sm" variant="secondary" type="submit">Save</Button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
        {rows.length === 0 ? <p className="py-8 text-center text-2">Nothing here yet.</p> : null}
      </div>
    </div>
  );
}
