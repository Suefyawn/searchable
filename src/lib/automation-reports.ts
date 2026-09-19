import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";

/**
 * Run reports from the scheduled editorial task, one row each (they used to share one settings value, which
 * outgrew D1's statement size). /admin/automation shows the newest; nothing prunes them, at six a day they stay small.
 */
export type RunReport = { id: string; slot: string; at: string; report: string; published?: number; updated?: number; errors?: number };

export async function readReports(limit = 60): Promise<RunReport[]> {
  const db = await getDb();
  const rows = await db.query.automationReports.findMany({ orderBy: [desc(schema.automationReports.at)], limit });
  return rows.map((r) => ({ id: r.id, slot: r.slot, at: r.at.toISOString(), report: r.report, published: r.published ?? undefined, updated: r.updated ?? undefined, errors: r.errors ?? undefined }));
}

export async function addReport(r: Omit<RunReport, "id" | "at"> & { at?: string }): Promise<RunReport> {
  const db = await getDb();
  const at = r.at ? new Date(r.at) : new Date();
  const [row] = await db.insert(schema.automationReports).values({ slot: r.slot, at, report: r.report, published: r.published ?? null, updated: r.updated ?? null, errors: r.errors ?? null }).returning({ id: schema.automationReports.id });
  return { id: row.id, at: at.toISOString(), slot: r.slot, report: r.report, published: r.published, updated: r.updated, errors: r.errors };
}
