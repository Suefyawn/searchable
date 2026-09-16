import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { addDataPoint, listSeriesWithLatest } from "@/db/queries/data";
import { resolveSeriesId, withAdminApi } from "@/lib/admin-api";
import { indexDataSeries } from "@/lib/indexers";
import { runIngestion } from "@/lib/ingest";

export const dynamic = "force-dynamic";
// Photo imports, ingestion and sends take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

/** GET /api/admin/data: every series with its latest and previous reading. */
export const GET = withAdminApi(async () => ({ series: await listSeriesWithLatest() }));

const Reading = z.object({
  series: z.string().min(1),
  value: z.number().finite(),
  /** YYYY-MM-DD in Pakistan time; defaults to today. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  note: z.string().max(300).optional(),
  sourceUrl: z.string().url().optional(),
});
const Body = z.union([z.object({ readings: z.array(Reading).min(1).max(50) }), z.object({ ingest: z.literal(true), force: z.boolean().optional(), only: z.array(z.string()).optional() })]);

/**
 * POST /api/admin/data
 *   { readings: [{ series, value, date?, note?, sourceUrl? }] }  record readings by hand (OGRA notification, SBP rate)
 *   { ingest: true, force?: true }                                run the automatic sources now
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  if ("ingest" in d) {
    const r = await runIngestion({ force: d.force, only: d.only });
    // Only the series that got a new reading re-render (ISR writes are metered).
    for (const x of r.results) if (x.status === "written") revalidatePath(`/data/${x.slug}`);
    revalidatePath("/data");
    revalidatePath("/");
    return { ok: true, ...r };
  }
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })).toISOString().slice(0, 10);
  const out = [];
  for (const r of d.readings) {
    const s = await resolveSeriesId(r.series);
    await addDataPoint(s.id, r.date ?? today, r.value, r.note, r.sourceUrl);
    await indexDataSeries(s.id);
    out.push({ series: r.series, date: r.date ?? today, value: r.value, unit: s.unit });
  }
  for (const x of out) revalidatePath(`/data/${x.series}`);
  revalidatePath("/data");
  revalidatePath("/");
  return { ok: true, recorded: out };
});

const Remove = z.object({ series: z.string().min(1), dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(60) });

/**
 * DELETE /api/admin/data { series, dates: ["2026-09-12", ...] }: remove readings that were wrong (a seed
 * placeholder, a parser slip). The series page and hub are re-rendered; the latest value moves back to the
 * newest remaining reading.
 */
export const DELETE = withAdminApi(async (_req, { body }) => {
  const d = Remove.parse(body);
  const s = await resolveSeriesId(d.series);
  const db = await getDb();
  const removed: string[] = [];
  for (const date of d.dates) {
    const r = await db.delete(schema.dataPoints).where(and(eq(schema.dataPoints.seriesId, s.id), eq(schema.dataPoints.date, date))).returning({ date: schema.dataPoints.date });
    if (r.length) removed.push(date);
  }
  await indexDataSeries(s.id);
  revalidatePath(`/data/${d.series}`);
  revalidatePath("/data");
  revalidatePath("/");
  return { ok: true, series: d.series, removed, missing: d.dates.filter((x) => !removed.includes(x)) };
});
