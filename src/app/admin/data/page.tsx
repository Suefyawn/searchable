import { revalidatePath } from "next/cache";
import Link from "next/link";
import { z } from "zod";
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
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Data</h1>
      <p className="mb-6 text-sm text-2">Record a new reading when a price or rate changes. Each series page, chart and JSON endpoint updates immediately; the linked calculators show the new default on next deploy.</p>
      <section className="mb-8 border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Automatic ingestion</p>
            <p className="text-sm text-2">SBP (USD/PKR, KIBOR, policy rate) · er-api cross rates (AED, SAR, GBP, EUR) · PSO (petrol, diesel) · spot gold and silver. Runs daily via cron; readings that jump more than 30% are held for review.</p>
          </div>
          <form action={fetchNow} className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5"><input type="checkbox" name="force" /> force large jumps</label>
            <Button size="sm" type="submit">Fetch now</Button>
          </form>
        </div>
        {last ? (
          <div className="mt-3 text-sm">
            <p className="text-3">Last run {formatDate(last.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{last.errors.length ? ` · ${last.errors.length} source error${last.errors.length > 1 ? "s" : ""}` : ""}</p>
            <ul className="mt-1 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {last.results.map((r) => (
                <li key={r.slug} className={r.status === "rejected" || r.status === "error" ? "text-red-700" : r.status === "unchanged" ? "text-3" : ""}>
                  <span className="font-mono text-xs">{r.slug}</span> · {r.status}
                  {r.value !== undefined ? ` · ${number(r.value, 2)}` : ""}
                  {r.previous !== undefined && r.status !== "unchanged" ? ` (was ${number(r.previous, 2)})` : ""}
                  {r.message ? `, ${r.message}` : ""}
                </li>
              ))}
              {last.errors.map((e) => (
                <li key={e} className="text-red-700">{e}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      <div className="space-y-3">
        {series.map((s) => (
          <form key={s.id} action={addPoint} className="surface flex flex-wrap items-end gap-3 p-4">
            <input type="hidden" name="seriesId" value={s.id} />
            <div className="min-w-56 flex-1">
              <p className="font-medium">
                <Link href={`/data/${s.slug}`} className="hover:text-brand-700">{s.name}</Link>
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
    </div>
  );
}
