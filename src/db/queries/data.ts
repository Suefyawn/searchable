import { desc, eq, sql } from "drizzle-orm";
import { getDb, rawQuery, schema } from "@/db";

export type SeriesSummary = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  frequency: string;
  sourceName: string | null;
  latest: { date: string; value: number } | null;
  previous: { date: string; value: number } | null;
};

/** Every series with its latest and previous point, for the hub and widgets. */
export async function listSeriesWithLatest(): Promise<SeriesSummary[]> {
  const db = await getDb();
  const rows = await rawQuery<{ id: string; slug: string; name: string; unit: string; frequency: string; source_name: string | null; latest_date: string | null; latest_value: number | null; prev_date: string | null; prev_value: number | null }>(
    db,
    sql`
      select s.id, s.slug, s.name, s.unit, s.frequency, s.source_name,
             l.date as latest_date, l.value as latest_value,
             p.date as prev_date, p.value as prev_value
      from data_series s
      left join lateral (select date, value from data_points where series_id = s.id order by date desc limit 1) l on true
      left join lateral (select date, value from data_points where series_id = s.id order by date desc limit 1 offset 1) p on true
      order by s.name
    `,
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    unit: r.unit,
    frequency: r.frequency,
    sourceName: r.source_name,
    latest: r.latest_date ? { date: String(r.latest_date), value: Number(r.latest_value) } : null,
    previous: r.prev_date ? { date: String(r.prev_date), value: Number(r.prev_value) } : null,
  }));
}

/** Last `n` values for every series, oldest → newest. For sparklines on hubs. */
export async function recentPointsBySeries(n = 30): Promise<Record<string, number[]>> {
  const db = await getDb();
  const rows = await rawQuery<{ series_id: string; value: number }>(
    db,
    sql`select series_id, value from (select series_id, value, date, row_number() over (partition by series_id order by date desc) as rn from data_points) t where rn <= ${n} order by series_id, date asc`,
  );
  const out: Record<string, number[]> = {};
  for (const r of rows) (out[r.series_id] ??= []).push(Number(r.value));
  return out;
}

export async function getSeries(slug: string, limit = 365) {
  const db = await getDb();
  const series = await db.query.dataSeries.findFirst({ where: eq(schema.dataSeries.slug, slug) });
  if (!series) return null;
  const points = await db.query.dataPoints.findMany({ where: eq(schema.dataPoints.seriesId, series.id), orderBy: [desc(schema.dataPoints.date)], limit });
  return { series, points: points.reverse() };
}

export async function seriesStats(seriesId: string) {
  const db = await getDb();
  const [row] = await rawQuery<{ min: number; max: number; avg: number; n: number; first: string; last: string }>(
    db,
    sql`select min(value) as min, max(value) as max, avg(value) as avg, count(*)::int as n, min(date) as first, max(date) as last from data_points where series_id = ${seriesId}`,
  );
  return row;
}

export async function addDataPoint(seriesId: string, date: string, value: number, note?: string, sourceUrl?: string) {
  const db = await getDb();
  await db
    .insert(schema.dataPoints)
    .values({ seriesId, date, value, note, sourceUrl })
    .onConflictDoUpdate({ target: [schema.dataPoints.seriesId, schema.dataPoints.date], set: { value, note, sourceUrl } });
}

