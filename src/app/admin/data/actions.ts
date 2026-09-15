"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { addDataPoint } from "@/db/queries/data";
import { requireRole } from "@/lib/auth";
import { indexDataSeries } from "@/lib/indexers";
import { runIngestion, type IngestResult } from "@/lib/ingest";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function revalidateData(slug?: string) {
  revalidatePath("/admin/data");
  revalidatePath("/data");
  revalidatePath("/");
  if (slug) revalidatePath(`/data/${slug}`);
  else revalidatePath("/data/[slug]", "page");
}

const Reading = z.object({
  seriesId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  value: z.number().finite(),
  note: z.string().trim().max(200).optional(),
  sourceUrl: z.string().trim().max(300).optional(),
});

/** One reading. Same date replaces the earlier value (the series page shows the latest correction). */
export async function addReadingAction(raw: z.input<typeof Reading>): Promise<Result<{ slug: string; previous: number | null }>> {
  await requireRole("editor");
  const parsed = Reading.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reading" };
  const d = parsed.data;
  const db = await getDb();
  const series = await db.query.dataSeries.findFirst({ where: eq(schema.dataSeries.id, d.seriesId), columns: { slug: true } });
  if (!series) return { ok: false, error: "Series not found" };
  const prev = await db.query.dataPoints.findFirst({ where: eq(schema.dataPoints.seriesId, d.seriesId), orderBy: [desc(schema.dataPoints.date)], columns: { value: true } });
  await addDataPoint(d.seriesId, d.date, d.value, d.note || undefined, d.sourceUrl || undefined);
  await indexDataSeries(d.seriesId);
  revalidateData(series.slug);
  return { ok: true, slug: series.slug, previous: prev?.value ?? null };
}

/**
 * Paste history: one reading per line as `YYYY-MM-DD, value[, note]`. Lines that do not parse are reported
 * and skipped; the rest are written. Backfills a series from a notification archive in one go.
 */
export async function addBulkAction(seriesId: string, text: string, sourceUrl?: string): Promise<Result<{ added: number; problems: string[] }>> {
  await requireRole("editor");
  const db = await getDb();
  const series = await db.query.dataSeries.findFirst({ where: eq(schema.dataSeries.id, seriesId), columns: { slug: true } });
  if (!series) return { ok: false, error: "Series not found" };
  const problems: string[] = [];
  const rows: { date: string; value: number; note?: string }[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 500)
    .forEach((line, i) => {
      const [date, value, ...rest] = line.split(/[,\t;]/).map((c) => c.trim());
      const v = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !Number.isFinite(v)) {
        problems.push(`Line ${i + 1}: "${line.slice(0, 40)}" is not date, value`);
        return;
      }
      rows.push({ date, value: v, note: rest.join(",").trim() || undefined });
    });
  for (const r of rows) await addDataPoint(seriesId, r.date, r.value, r.note, sourceUrl?.trim() || undefined);
  if (rows.length) {
    await indexDataSeries(seriesId);
    revalidateData(series.slug);
  }
  return { ok: true, added: rows.length, problems };
}

/** Remove a wrong reading; the series page and index follow. */
export async function deleteReadingAction(pointId: string): Promise<Result> {
  await requireRole("editor");
  const db = await getDb();
  const p = await db.query.dataPoints.findFirst({ where: eq(schema.dataPoints.id, pointId), with: { series: { columns: { slug: true } } } });
  if (!p) return { ok: false, error: "Reading not found" };
  await db.delete(schema.dataPoints).where(eq(schema.dataPoints.id, pointId));
  await indexDataSeries(p.seriesId);
  revalidateData(p.series?.slug);
  return { ok: true };
}

/** Run the sources now; `only` accepts held readings one at a time with force. */
export async function ingestNowAction(opts: { force?: boolean; only?: string[] }): Promise<Result<{ results: IngestResult[]; errors: string[]; at: string }>> {
  await requireRole("editor");
  try {
    const r = await runIngestion({ force: !!opts.force, only: opts.only });
    revalidateData();
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const SeriesInput = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(3).max(120),
  unit: z.string().trim().min(1).max(20),
  frequency: z.enum(["daily", "weekly", "fortnightly", "monthly", "ad-hoc"]),
  description: z.string().trim().max(400).optional(),
  sourceName: z.string().trim().max(120).optional(),
  sourceUrl: z.string().trim().max(300).optional(),
});

export async function updateSeriesAction(raw: z.input<typeof SeriesInput>): Promise<Result> {
  await requireRole("editor");
  const parsed = SeriesInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid series" };
  const d = parsed.data;
  const db = await getDb();
  const s = await db.query.dataSeries.findFirst({ where: eq(schema.dataSeries.id, d.id), columns: { slug: true } });
  if (!s) return { ok: false, error: "Series not found" };
  await db.update(schema.dataSeries).set({ name: d.name, unit: d.unit, frequency: d.frequency, description: d.description || null, sourceName: d.sourceName || null, sourceUrl: d.sourceUrl || null }).where(eq(schema.dataSeries.id, d.id));
  await indexDataSeries(d.id);
  revalidateData(s.slug);
  return { ok: true };
}
