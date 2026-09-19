import { unstable_cache } from "next/cache";

/**
 * Reads for /admin/metrics from Workers Analytics Engine's SQL API (ADR-48). Needs CF_ANALYTICS_TOKEN (an API
 * token with Account Analytics Read) and CF_ACCOUNT_ID; without them the page says so instead of failing.
 * Cached ten minutes so the page costs a few reads a day against the 10k daily allowance, however often it is
 * opened. Events are written by src/lib/track.ts: blob1 is the event name, blob2 onwards the event's own fields.
 */
const DATASET = () => process.env.ANALYTICS_DATASET ?? "searchable_events";

export const metricsConfigured = () => Boolean(process.env.CF_ANALYTICS_TOKEN && process.env.CF_ACCOUNT_ID);

async function sqlQuery<T>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CF_ANALYTICS_TOKEN}` },
    body: query,
  });
  if (!res.ok) throw new Error(`analytics sql ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { data: T[] };
  return data.data;
}

export type DailyCount = { event: string; day: string; n: number };
export type TopRow = { key: string; n: number };

export const readMetrics = unstable_cache(
  async () => {
    const ds = DATASET();
    const [daily, searches, tools, categories] = await Promise.all([
      sqlQuery<DailyCount>(`SELECT blob1 AS event, toDateTime(toStartOfInterval(timestamp, INTERVAL '1' DAY)) AS day, SUM(_sample_interval) AS n FROM ${ds} WHERE timestamp > NOW() - INTERVAL '14' DAY GROUP BY event, day ORDER BY day`),
      sqlQuery<TopRow>(`SELECT blob2 AS key, SUM(_sample_interval) AS n FROM ${ds} WHERE blob1 = 'search_performed' AND blob2 != '' AND timestamp > NOW() - INTERVAL '7' DAY GROUP BY key ORDER BY n DESC LIMIT 20`),
      sqlQuery<TopRow>(`SELECT blob2 AS key, SUM(_sample_interval) AS n FROM ${ds} WHERE blob1 = 'calculator_used' AND timestamp > NOW() - INTERVAL '7' DAY GROUP BY key ORDER BY n DESC LIMIT 15`),
      sqlQuery<TopRow>(`SELECT blob3 AS key, SUM(_sample_interval) AS n FROM ${ds} WHERE blob1 = 'directory_view' AND blob3 != '' AND timestamp > NOW() - INTERVAL '7' DAY GROUP BY key ORDER BY n DESC LIMIT 10`),
    ]);
    return { daily: daily.map((d) => ({ ...d, n: Number(d.n) })), searches, tools, categories, at: new Date().toISOString() };
  },
  ["admin-metrics"],
  { revalidate: 600 },
);
