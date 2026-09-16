import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";

/**
 * SEO content backlog: what people in Pakistan search for that the site does not answer yet, with Semrush
 * volume and difficulty, the page we intend to build and its status. Lives in one settings row; the scheduled
 * task reads it through the admin API and takes the best open item each run.
 */
export const BacklogItem = z.object({
  keyword: z.string().trim().min(2).max(120),
  /** Monthly searches in Pakistan (Semrush, pk database). */
  volume: z.number().int().nonnegative(),
  /** Keyword difficulty 0-100. */
  kd: z.number().int().min(0).max(100),
  /** What to build. */
  type: z.enum(["guide", "news", "data", "tool", "compare", "hub", "update"]),
  /** Where it should live or what to update, e.g. /guides/utilities/lesco-bill-check-online. */
  target: z.string().trim().max(200),
  /** Brief for the writer: angle, must-have sections, sources to use. */
  brief: z.string().trim().max(600).optional(),
  status: z.enum(["open", "in_progress", "done", "dropped"]).default("open"),
  /** Published URL once done. */
  url: z.string().trim().max(300).optional(),
  note: z.string().trim().max(600).optional(),
  updatedAt: z.string().optional(),
});
export type BacklogItemT = z.infer<typeof BacklogItem>;

const KEY = "seo:backlog";

/**
 * Higher is better: monthly searches weighted by how likely a young site is to rank, taken as ((100 - KD) / 100)
 * squared. A 200k term at KD 25 (score 112,500) beats a 1M term at KD 73 (72,900).
 */
export function backlogScore(i: Pick<BacklogItemT, "volume" | "kd">) {
  const reach = (100 - Math.min(99, i.kd)) / 100;
  return Math.round(i.volume * reach * reach);
}

export async function readBacklog(): Promise<BacklogItemT[]> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, KEY) });
  const items = ((row?.value as { items?: unknown[] } | undefined)?.items ?? []) as BacklogItemT[];
  const order = { in_progress: 0, open: 1, done: 2, dropped: 3 };
  return [...items].sort((a, b) => order[a.status] - order[b.status] || backlogScore(b) - backlogScore(a));
}

async function writeBacklog(items: BacklogItemT[]) {
  const db = await getDb();
  const value = { items, updatedAt: new Date().toISOString() };
  await db.insert(schema.settings).values({ key: KEY, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

/** Add or replace items by keyword (case-insensitive). Existing status and url survive unless given. */
export async function upsertBacklog(incoming: (Omit<BacklogItemT, "status"> & { status?: BacklogItemT["status"] })[]): Promise<{ added: number; updated: number }> {
  const items = await readBacklog();
  let added = 0;
  let updated = 0;
  for (const it of incoming) {
    const i = items.findIndex((x) => x.keyword.toLowerCase() === it.keyword.toLowerCase());
    const stamped = { ...it, status: it.status ?? "open", updatedAt: new Date().toISOString() } as BacklogItemT;
    if (i === -1) {
      items.push(stamped);
      added += 1;
    } else {
      items[i] = { ...items[i], ...stamped, status: it.status ?? items[i].status, url: it.url ?? items[i].url };
      updated += 1;
    }
  }
  await writeBacklog(items);
  return { added, updated };
}

export async function setBacklogStatus(keyword: string, patch: { status: BacklogItemT["status"]; url?: string; note?: string }): Promise<boolean> {
  const items = await readBacklog();
  const i = items.findIndex((x) => x.keyword.toLowerCase() === keyword.toLowerCase());
  if (i === -1) return false;
  items[i] = { ...items[i], ...patch, updatedAt: new Date().toISOString() };
  await writeBacklog(items);
  return true;
}

export async function removeBacklog(keyword: string): Promise<boolean> {
  const items = await readBacklog();
  const next = items.filter((x) => x.keyword.toLowerCase() !== keyword.toLowerCase());
  if (next.length === items.length) return false;
  await writeBacklog(next);
  return true;
}
