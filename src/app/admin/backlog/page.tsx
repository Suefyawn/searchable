import { revalidatePath } from "next/cache";
import Link from "next/link";
import { AdminPage, FilterTabs, Status } from "@/components/admin";
import { Button } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { backlogScore, readBacklog, setBacklogStatus } from "@/lib/backlog";
import { formatDate, number } from "@/lib/format";

export const dynamic = "force-dynamic";
const STATUSES = ["open", "in_progress", "done", "dropped", "all"] as const;

async function setStatus(keyword: string, status: "open" | "in_progress" | "done" | "dropped") {
  "use server";
  await requireRole("editor");
  await setBacklogStatus(keyword, { status });
  revalidatePath("/admin/backlog");
}

/** The search-demand backlog the scheduled task works through; editors can reprioritise by hand. */
export default async function BacklogPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "open" } = await searchParams;
  const items = await readBacklog();
  const visible = items.filter((i) => status === "all" || i.status === status);
  const count = (s: string) => (s === "all" ? items.length : items.filter((i) => i.status === s).length);
  return (
    <AdminPage title="Content backlog" description="What people in Pakistan search for that the site does not answer well yet, from Semrush's Pakistan database. Score is monthly searches weighted by how likely a young site is to rank ((100 minus KD) squared). The scheduled task takes the top open item each run and marks it done with the URL." wide>
      <FilterTabs items={STATUSES.map((s) => ({ href: `/admin/backlog?status=${s}`, label: s.replace("_", " "), count: count(s), active: status === s }))} />
      {visible.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-2">Nothing here.</p>
      ) : (
        <div className="mt-2 divide-y divide-[var(--border)] border-b border-line">
          {visible.map((i) => (
            <div key={i.keyword} className="grid gap-x-6 gap-y-2 py-3 md:grid-cols-[minmax(0,2fr)_7rem_7rem_minmax(0,1.6fr)_auto] md:items-start">
              <div className="min-w-0">
                <p className="font-medium">
                  {i.keyword} <Status value={i.status === "in_progress" ? "review" : i.status === "done" ? "published" : i.status === "dropped" ? "closed" : "new"} className="ml-1" />
                </p>
                <p className="text-[13px] text-3">
                  <span className="uppercase tracking-[0.08em]">{i.type}</span> · {i.url ? <Link href={i.url} className="underline underline-offset-4">{i.url}</Link> : i.target}
                  {i.updatedAt ? ` · ${formatDate(i.updatedAt)}` : ""}
                </p>
              </div>
              <div className="tabular text-[14px]">
                <span className="font-semibold">{number(i.volume)}</span>
                <span className="block text-[12px] text-3">searches / month</span>
              </div>
              <div className="tabular text-[14px]">
                <span className="font-semibold">{i.kd}</span> <span className="text-3">KD</span>
                <span className="block text-[12px] text-3">score {number(backlogScore(i))}</span>
              </div>
              <p className="text-[13.5px] text-2">{i.brief}</p>
              <div className="flex flex-wrap gap-1.5">
                {i.status !== "done" ? (
                  <form action={setStatus.bind(null, i.keyword, "done")}>
                    <Button size="sm" variant="outline" type="submit">
                      Done
                    </Button>
                  </form>
                ) : null}
                {i.status !== "open" ? (
                  <form action={setStatus.bind(null, i.keyword, "open")}>
                    <Button size="sm" variant="ghost" type="submit">
                      Reopen
                    </Button>
                  </form>
                ) : (
                  <form action={setStatus.bind(null, i.keyword, "dropped")}>
                    <Button size="sm" variant="ghost" type="submit">
                      Drop
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
