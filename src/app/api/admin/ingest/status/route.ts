import { getDb, schema } from "@/db";
import { withAdminApi } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/ingest/status: last run, last success, last value and last error per automatically ingested
 * series (and per source that failed), with the hours since the last success, so a slot can check that a number
 * is fresh before writing about it and flag stale sources in its report.
 */
export const GET = withAdminApi(async () => {
  const db = await getDb();
  const rows = await db.select().from(schema.ingestRuns);
  const now = Date.now();
  return {
    at: new Date(now).toISOString(),
    sources: rows
      .map((r) => ({
        source: r.source,
        lastRunAt: r.lastRunAt.toISOString(),
        lastSuccessAt: r.lastSuccessAt?.toISOString() ?? null,
        lastValue: r.lastValue,
        lastStatus: r.lastStatus,
        lastError: r.lastError,
        staleHours: r.lastSuccessAt ? Math.round((now - r.lastSuccessAt.getTime()) / 3_600_000) : null,
      }))
      .sort((a, b) => (b.staleHours ?? 1e9) - (a.staleHours ?? 1e9)),
  };
});
