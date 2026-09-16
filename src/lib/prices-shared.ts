import { z } from "zod";

/*
 * Living price lists (ADR-35): mobiles, bikes and cars by model, the "X price in Pakistan" queries that are
 * the largest low-competition searches in the country. The page layout is code; every item is data the
 * scheduled task keeps current from the makers' official Pakistan price lists through POST /api/admin/prices.
 * Client components import from here; the database side lives in prices-data.ts.
 */

export const PRICE_CATEGORIES = ["mobiles", "bikes", "cars"] as const;
export type PriceCategory = (typeof PRICE_CATEGORIES)[number];

export const PRICE_CATEGORY_META: Record<PriceCategory, { name: string; singular: string; query: string; specs: { key: string; label: string; unit?: string }[]; required: string[] }> = {
  mobiles: {
    name: "Mobile phones",
    singular: "phone",
    query: "mobile prices in Pakistan",
    specs: [
      { key: "display", label: "Display" },
      { key: "chipset", label: "Chipset" },
      { key: "ram", label: "RAM" },
      { key: "storage", label: "Storage" },
      { key: "camera", label: "Rear camera" },
      { key: "front", label: "Front camera" },
      { key: "battery", label: "Battery" },
      { key: "charging", label: "Charging" },
      { key: "os", label: "OS" },
      { key: "network", label: "Network" },
    ],
    required: ["ram", "storage", "battery"],
  },
  bikes: {
    name: "Motorcycles",
    singular: "bike",
    query: "bike prices in Pakistan",
    specs: [
      { key: "engine", label: "Engine" },
      { key: "power", label: "Power" },
      { key: "mileage", label: "Mileage" },
      { key: "fuelTank", label: "Fuel tank" },
      { key: "transmission", label: "Transmission" },
      { key: "starter", label: "Starter" },
      { key: "weight", label: "Weight" },
      { key: "type", label: "Type" },
    ],
    required: ["engine"],
  },
  cars: {
    name: "Cars",
    singular: "car",
    query: "car prices in Pakistan",
    specs: [
      { key: "engine", label: "Engine" },
      { key: "transmission", label: "Transmission" },
      { key: "fuel", label: "Fuel" },
      { key: "mileage", label: "Mileage" },
      { key: "seats", label: "Seats" },
      { key: "body", label: "Body" },
      { key: "origin", label: "Assembled" },
    ],
    required: ["engine"],
  },
};

export const PriceVariant = z.object({ name: z.string().trim().min(1).max(80), price: z.number().int().positive() });

export const PriceItem = z.object({
  /** Stable id and URL segment, e.g. vivo-y29 or honda-cd-70. Lowercase, hyphens. */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(120),
  /** Official Pakistan price of the base variant, in rupees. */
  price: z.number().int().positive(),
  priceNote: z.string().trim().max(200).optional(),
  variants: z.array(PriceVariant).max(20).optional(),
  specs: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).default({}),
  /** The maker's or an authorised seller's page for this model. */
  url: z.string().url().max(300).optional(),
  source: z.object({ title: z.string().max(200), url: z.string().url().max(300), publisher: z.string().max(120).optional() }),
  image: z.object({ url: z.string().url().max(300), alt: z.string().max(200).optional(), credit: z.string().max(200).optional() }).optional(),
  /** Month the model went on sale in Pakistan, YYYY-MM. */
  released: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  /** Free text the model page shows under the specs: what is new, who it suits. Up to 600 characters. */
  note: z.string().trim().max(600).optional(),
  /** Price history, oldest first; kept by the server when a price changes. */
  history: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), price: z.number().int().positive() })).max(60).default([]),
  updatedAt: z.string().optional(),
});
export type PriceItemT = z.infer<typeof PriceItem>;

export function brandSlug(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The cheapest and dearest variant, base price included. */
export function priceRange(i: PriceItemT): { min: number; max: number } {
  const all = [i.price, ...(i.variants ?? []).map((v) => v.price)];
  return { min: Math.min(...all), max: Math.max(...all) };
}

/** Merge new items into the current set: unknown slugs are added, known ones updated, price moves recorded. */
export function mergePriceItems(current: PriceItemT[], incoming: PriceItemT[], today: string): { items: PriceItemT[]; added: number; updated: number; priceMoves: { slug: string; from: number; to: number }[] } {
  const bySlug = new Map(current.map((i) => [i.slug, i]));
  let added = 0;
  let updated = 0;
  const priceMoves: { slug: string; from: number; to: number }[] = [];
  for (const raw of incoming) {
    const prev = bySlug.get(raw.slug);
    let history = prev?.history ?? [];
    if (!prev) {
      added += 1;
      history = raw.history.length ? raw.history : [{ date: today, price: raw.price }];
    } else {
      updated += 1;
      if (prev.price !== raw.price) {
        priceMoves.push({ slug: raw.slug, from: prev.price, to: raw.price });
        history = [...history.filter((h) => h.date !== today), { date: today, price: raw.price }].slice(-60);
      }
      if (!history.length) history = [{ date: today, price: raw.price }];
    }
    bySlug.set(raw.slug, { ...raw, history, updatedAt: new Date().toISOString() });
  }
  return { items: [...bySlug.values()].sort((a, b) => a.brand.localeCompare(b.brand) || a.price - b.price), added, updated, priceMoves };
}
