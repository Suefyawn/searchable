import { revalidatePath } from "next/cache";
import Link from "next/link";
import { z } from "zod";
import { AdminPage, Section } from "@/components/admin";
import { Button, Input } from "@/components/ui";
import { addDataPoint, listSeriesWithLatest } from "@/db/queries/data";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { indexDataSeries } from "@/lib/indexers";
import { runIngestion, type IngestResult } from "@/lib/ingest";
import { formatDate, number } from "@/lib/format";

export const dynamic = "force-dynamic";

const Point = z.object({ seriesId: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), value: z.coerce.number(), note: z.string().max(200).optional(), sourceUrl: z.string().max(300).optional() });

async function addPoint(formData: FormData) {
  "use server";
  await requireRole("editor");
  const parsed = Point.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const d = parsed.data;
  await addDataPoint(d.seriesId, d.date, d.value, d.note || undefined, d.sourceUrl || undefined);
  await indexDataSeries(d.seriesId);
  revalidatePath("/data");
  revalidatePath("/data/[slug]", "page");
  revalidatePath("/admin/data");
}

async function fetchNow(formData: FormData) {
  "use server";
  await requireRole("editor");
  await runIngestion({ force: formData.get("force") === "on" });
  revalidatePath("/data");
  revalidatePath("/data/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/admin/data");
}

export default async function AdminData() {
  const db = await getDb();
  const [series, lastRow] = await Promise.all([listSeriesWithLatest(), db.query.settings.findFirst({ where: eq(schema.settings.key, "ingest:last") })]);
  const last = (lastRow?.value as { at: string; results: IngestResult[]; errors: string[] } | undefined) ?? null;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })).toISOString().slice(0, 10);
  return (
    <AdminPage
      title="Data hub"
      description="Record a reading when a price or rate changes. Every series page, chart, JSON endpoint and the search index update at once; calculators pick up the new default on the next deploy."
      actions={
        <form action={fetchNow} className="flex items-center gap-3 text-[13.5px]">
          <label className="flex items-center gap-1.5 text-2">
            <input type="checkbox" name="force" className="accent-ink-900" /> force large jumps
          </label>
          <Button size="sm" type="submit">
            Fetch now
          </Button>
        </form>
      }
      wide
    >
      <Section title="Automatic ingestion" description="SBP (USD/PKR, KIBOR, policy rate) · er-api cross rates · PSO fuel · spot gold and silver · PSX · CoinGecko. Daily by cron; readings that jump more than 30% are held for review." className="mb-8">
        {last ? (
          <div className="text-[14px]">
            <p className="text-3">
              Last run {formatDate(last.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {last.errors.length ? ` · ${last.errors.length} source error${last.errors.length > 1 ? "s" : ""}` : ""}
            </p>
            <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {last.results.map((r) => (
                <li key={r.slug} className={r.status === "rejected" || r.status === "error" ? "font-medium" : r.status === "unchanged" ? "text-3" : ""}>
                  <span className="font-mono text-[12px]">{r.slug}</span> · {r.status}
                  {r.value !== undefined ? ` · ${number(r.value, 2)}` : ""}
                  {r.previous !== undefined && r.status !== "unchanged" ? ` (was ${number(r.previous, 2)})` : ""}
                  {r.message ? `, ${r.message}` : ""}
                </li>
              ))}
              {last.errors.map((e) => (
                <li key={e} className="font-medium">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[14px] text-3">Not run yet. Fetch now, or wait for the daily cron.</p>
        )}
      </Section>
      <div className="divide-y divide-[var(--border)] border-y border-line">
        {series.map((s) => (
          <form key={s.id} action={addPoint} className="flex flex-wrap items-end gap-3 py-3">
            <input type="hidden" name="seriesId" value={s.id} />
            <div className="min-w-56 flex-1">
              <p className="font-medium">
                <Link href={`/data/${s.slug}`} className="hover:underline underline-offset-4">{s.name}</Link>
              </p>
              <p className="text-sm text-3">
                {s.latest ? `Latest ${number(s.latest.value, Number.isInteger(s.latest.value) ? 0 : 2)} ${s.unit} on ${formatDate(s.latest.date)}` : "No readings yet"} · {s.frequency}
              </p>
            </div>
            <label className="text-xs text-3">
              Date
              <Input name="date" type="date" defaultValue={today} required className="mt-1 h-9 w-40 text-sm" />
            </label>
            <label className="text-xs text-3">
              Value ({s.unit})
              <Input name="value" type="number" step="any" required className="mt-1 h-9 w-32 text-sm tabular" />
            </label>
            <label className="text-xs text-3">
              Note
              <Input name="note" maxLength={200} placeholder="e.g. OGRA notification" className="mt-1 h-9 w-52 text-sm" />
            </label>
            <label className="text-xs text-3">
              Source URL
              <Input name="sourceUrl" maxLength={300} placeholder="https://" className="mt-1 h-9 w-52 text-sm" />
            </label>
            <Button size="sm" type="submit">
              Add reading
            </Button>
          </form>
        ))}
      </div>
    </AdminPage>
  );
}
