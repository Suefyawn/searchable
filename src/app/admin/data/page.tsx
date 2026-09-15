import { eq, sql } from "drizzle-orm";
import { AdminPage } from "@/components/admin";
import { getDb, rawQuery, schema } from "@/db";
import { listSeriesWithLatest } from "@/db/queries/data";
import { AUTO_SERIES, type IngestResult } from "@/lib/ingest";
import { DataHub, type IngestRun, type Point, type SeriesRow } from "./data-hub";

export const dynamic = "force-dynamic";

/** Days a reading may be before the series counts as stale, by how often it is meant to move. */
const STALE_AFTER: Record<string, number> = { daily: 2, weekly: 9, fortnightly: 18, monthly: 40, "ad-hoc": 3650 };

/**
 * Data hub: every series with its latest reading, change, sparkline and freshness; add a reading, paste a
 * history, remove a wrong one, edit the series, run or accept automatic readings. All from one screen.
 */
export default async function AdminData() {
  const db = await getDb();
  const [summaries, lastRow, points, details] = await Promise.all([
    listSeriesWithLatest(),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "ingest:last") }),
    rawQuery<{ id: string; series_id: string; date: string; value: number; note: string | null; source_url: string | null }>(
      db,
      sql`select id, series_id, date::text as date, value, note, source_url from (select *, row_number() over (partition by series_id order by date desc) as rn from data_points) t where rn <= 30 order by series_id, date asc`,
    ),
    db.query.dataSeries.findMany({ columns: { id: true, description: true, sourceUrl: true } }),
  ]);
  const byId = new Map<string, Point[]>();
  for (const p of points) (byId.get(p.series_id) ?? byId.set(p.series_id, []).get(p.series_id)!).push({ id: p.id, date: p.date, value: Number(p.value), note: p.note, sourceUrl: p.source_url });
  const detail = new Map(details.map((d) => [d.id, d]));
  const todayMs = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })).setHours(0, 0, 0, 0);
  const auto = new Set<string>(AUTO_SERIES);
  const series: SeriesRow[] = summaries.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    unit: s.unit,
    frequency: s.frequency,
    description: detail.get(s.id)?.description ?? null,
    sourceName: s.sourceName,
    sourceUrl: detail.get(s.id)?.sourceUrl ?? null,
    auto: auto.has(s.slug),
    latest: s.latest,
    previous: s.previous,
    points: byId.get(s.id) ?? [],
    ageDays: s.latest ? Math.max(0, Math.round((todayMs - new Date(s.latest.date).getTime()) / 86_400_000)) : null,
    staleAfter: STALE_AFTER[s.frequency] ?? 7,
  }));
  const last = (lastRow?.value as { at: string; results: IngestResult[]; errors: string[] } | undefined) ?? null;
  return (
    <AdminPage title="Data hub" description="The numbers the site quotes, with where each one came from. Recording a reading updates the series page, its chart and JSON, the search index and the front-page ticker at once." wide>
      <DataHub series={series} last={last as IngestRun} />
    </AdminPage>
  );
}
