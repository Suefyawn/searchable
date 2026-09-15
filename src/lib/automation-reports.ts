import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

/**
 * Run reports from the scheduled editorial task, kept in one settings row (the last 60) so the founder can read
 * them in admin instead of in the task's own console. Small text, no table needed.
 */
export type RunReport = { id: string; slot: string; at: string; report: string; published?: number; updated?: number; errors?: number };
const KEY = "automation:reports";
const KEEP = 60;

export async function readReports(): Promise<RunReport[]> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, KEY) });
  return ((row?.value as { items?: RunReport[] } | undefined)?.items ?? []).slice().sort((a, b) => b.at.localeCompare(a.at));
}

export async function addReport(r: Omit<RunReport, "id" | "at"> & { at?: string }): Promise<RunReport> {
  const db = await getDb();
  const items = await readReports();
  const item: RunReport = { id: crypto.randomUUID(), at: r.at ?? new Date().toISOString(), slot: r.slot, report: r.report, published: r.published, updated: r.updated, errors: r.errors };
  const value = { items: [item, ...items].slice(0, KEEP) };
  await db.insert(schema.settings).values({ key: KEY, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  return item;
}
