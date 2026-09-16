import { z } from "zod";

/* Types and pure helpers for the living comparisons, safe to import from client components (no database). */

export const LIVING_SLUGS = ["air-conditioners", "credit-cards", "mobile-packages", "national-savings"] as const;
export type LivingSlug = (typeof LIVING_SLUGS)[number];

export const LivingItem = z.object({
  /** Stable id, e.g. "haier-hsu-18hfcf" or "hbl-platinum". */
  id: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, "lowercase letters, digits and hyphens"),
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(120),
  /** Headline price in rupees (for a card: the annual fee). */
  price: z.number().nonnegative(),
  priceNote: z.string().trim().max(120).optional(),
  /** Where the number came from (the brand's store page, the bank's schedule of charges). */
  url: z.string().trim().url().max(300).optional(),
  specs: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).default({}),
  note: z.string().trim().max(200).optional(),
});
export type LivingItemT = z.infer<typeof LivingItem>;

export const specText = (v: string | number | boolean | null | undefined): string => (v === null || v === undefined || v === "" ? "-" : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v));
export const specNum = (v: string | number | boolean | null | undefined): number | null => (typeof v === "number" ? v : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null);
