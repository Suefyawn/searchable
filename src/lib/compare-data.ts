import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { LivingItem, LIVING_SLUGS, type LivingSlug } from "./compare-shared";

export { LivingItem, LIVING_SLUGS, specNum, specText, type LivingItemT, type LivingSlug } from "./compare-shared";

/*
 * Living comparisons: the page's columns, filters and sorts are code (src/components/compare/living/*), the
 * items are data an editor or the scheduled task keeps current through POST /api/admin/compare. Cars and
 * inverters stay as versioned files (their prices move with notifications); air conditioners and credit cards
 * move with retailers and banks every month, so they live in a settings row with a review date and source.
 */



export const LivingSet = z.object({
  items: z.array(LivingItem).max(200).default([]),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  source: z.object({ title: z.string().max(200), url: z.string().url().max(300).optional(), publisher: z.string().max(120).optional() }).optional(),
  updatedAt: z.string().optional(),
});
export type LivingSetT = z.infer<typeof LivingSet>;

/** Spec keys each page expects; missing ones show as a dash, unknown ones are ignored. */
export const REQUIRED_SPECS: Record<LivingSlug, string[]> = {
  "air-conditioners": ["tonnage", "inverter"],
  "credit-cards": ["bank", "network"],
  "mobile-packages": ["network", "validity", "data"],
};

export async function readLivingSet(slug: LivingSlug): Promise<LivingSetT> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, `compare:${slug}`) });
  const parsed = LivingSet.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : { items: [] };
}

export async function writeLivingSet(slug: LivingSlug, set: Omit<LivingSetT, "updatedAt">): Promise<LivingSetT> {
  const db = await getDb();
  const value: LivingSetT = { ...LivingSet.parse(set), updatedAt: new Date().toISOString() };
  const missing = value.items.filter((i) => REQUIRED_SPECS[slug].some((k) => i.specs[k] === undefined || i.specs[k] === null));
  if (missing.length) throw new Error(`Items without ${REQUIRED_SPECS[slug].join(", ")}: ${missing.map((i) => i.id).slice(0, 5).join(", ")}`);
  const ids = new Set<string>();
  for (const i of value.items) {
    if (ids.has(i.id)) throw new Error(`Duplicate id ${i.id}`);
    ids.add(i.id);
  }
  await db.insert(schema.settings).values({ key: `compare:${slug}`, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  return value;
}
