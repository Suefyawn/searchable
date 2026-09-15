import { revalidatePath } from "next/cache";
import Link from "next/link";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { addDataPoint, listSeriesWithLatest } from "@/db/queries/data";
import { requireRole } from "@/lib/auth";
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
  revalidatePath("/data");
  revalidatePath("/data/[slug]", "page");
  revalidatePath("/admin/data");
}

export default async function AdminData() {
  const series = await listSeriesWithLatest();
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })).toISOString().slice(0, 10);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Data</h1>
      <p className="mb-6 text-sm text-2">Record a new reading when a price or rate changes. Each series page, chart and JSON endpoint updates immediately; the linked calculators show the new default on next deploy.</p>
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
