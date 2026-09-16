import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, qs, withAdminApi } from "@/lib/admin-api";
import { PRICE_CATEGORIES, PriceItem, type PriceCategory } from "@/lib/prices-shared";
import { readPriceSet, writePriceSet } from "@/lib/prices-data";

export const dynamic = "force-dynamic";

function category(raw: string): PriceCategory {
  if (!(PRICE_CATEGORIES as readonly string[]).includes(raw)) throw new ApiError(400, `category must be one of ${PRICE_CATEGORIES.join(", ")}`);
  return raw as PriceCategory;
}

/** GET /api/admin/prices?category=mobiles[&brand=vivo]: current items with history. */
export const GET = withAdminApi(async (req) => {
  const q = qs(req);
  const cat = category(q.str("category", "") ?? "");
  const brand = (q.str("brand", "") ?? "").toLowerCase();
  const set = await readPriceSet(cat);
  const items = brand ? set.items.filter((i) => i.brand.toLowerCase() === brand) : set.items;
  return { category: cat, reviewedAt: set.reviewedAt ?? null, count: items.length, items };
});

const Body = z.object({
  category: z.enum(PRICE_CATEGORIES),
  /** Items to add or update (upsert) or the full list (replace). */
  items: z.array(PriceItem.omit({ history: true, updatedAt: true }).extend({ history: PriceItem.shape.history.optional() })).max(500).default([]),
  mode: z.enum(["upsert", "replace"]).default("upsert"),
  /** Slugs to drop (discontinued models). */
  remove: z.array(z.string()).max(200).optional(),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * POST /api/admin/prices { category, items: [...], mode?: "upsert" | "replace", remove?: [...], reviewedAt? }
 * Item shape in src/lib/prices-shared.ts. Upsert keeps every model not mentioned; a changed price is written
 * to that model's history automatically. Every item needs a source URL (the maker's Pakistan price list or
 * an authorised seller) and the category's required specs (mobiles: ram, storage, battery; bikes and cars: engine).
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  let result;
  try {
    result = await writePriceSet(d.category, { items: d.items.map((i) => ({ ...i, history: i.history ?? [] })), mode: d.mode, remove: d.remove, reviewedAt: d.reviewedAt });
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
  revalidatePath("/prices");
  revalidatePath(`/prices/${d.category}`, "layout");
  return { ok: true, category: d.category, live: result.items.length, added: result.added, updated: result.updated, removed: result.removed, priceMoves: result.priceMoves };
});
