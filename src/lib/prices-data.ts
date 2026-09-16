import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { mergePriceItems, PRICE_CATEGORY_META, PriceItem, type PriceCategory, type PriceItemT } from "./prices-shared";

export { brandSlug, PRICE_CATEGORIES, PRICE_CATEGORY_META, priceRange, type PriceCategory, type PriceItemT } from "./prices-shared";

export const PriceSet = z.object({
  items: z.array(PriceItem).max(2000).default([]),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  updatedAt: z.string().optional(),
});
export type PriceSetT = z.infer<typeof PriceSet>;

/** Fewer live items than this and the category is noindex (a thin list ranks for nothing and looks bare). */
export const PRICE_INDEX_MIN = 10;

export async function readPriceSet(category: PriceCategory): Promise<PriceSetT> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, `prices:${category}`) });
  const parsed = PriceSet.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : { items: [] };
}

/**
 * Upsert (default) or replace the items of a category. Required specs are enforced per category so a model
 * page never shows a dash where the buyer expects the number. Returns what changed so the task can report it.
 */
export async function writePriceSet(category: PriceCategory, input: { items: PriceItemT[]; reviewedAt?: string; mode?: "upsert" | "replace"; remove?: string[] }) {
  const meta = PRICE_CATEGORY_META[category];
  const missing = input.items.filter((i) => meta.required.some((k) => i.specs[k] === undefined || i.specs[k] === ""));
  if (missing.length) throw new Error(`Items without ${meta.required.join(", ")}: ${missing.map((i) => i.slug).slice(0, 5).join(", ")}`);
  const seen = new Set<string>();
  for (const i of input.items) {
    if (seen.has(i.slug)) throw new Error(`Duplicate slug ${i.slug}`);
    seen.add(i.slug);
  }
  const current = input.mode === "replace" ? [] : (await readPriceSet(category)).items;
  const today = new Date().toISOString().slice(0, 10);
  const merged = mergePriceItems(current, input.items, today);
  const removeSet = new Set(input.remove ?? []);
  const items = merged.items.filter((i) => !removeSet.has(i.slug));
  const value: PriceSetT = { items, reviewedAt: input.reviewedAt ?? today, updatedAt: new Date().toISOString() };
  const db = await getDb();
  await db.insert(schema.settings).values({ key: `prices:${category}`, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  return { ...merged, items, removed: merged.items.length - items.length };
}

export async function findPriceItem(category: PriceCategory, slug: string): Promise<{ item: PriceItemT; set: PriceSetT } | null> {
  const set = await readPriceSet(category);
  const item = set.items.find((i) => i.slug === slug);
  return item ? { item, set } : null;
}
