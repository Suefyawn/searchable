import { cache } from "react";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";

/*
 * Site settings an editor can change without a deployment (/admin/settings): the brand kit colours that
 * every colour on the site derives from (globals.css), the identity lines, the front-page rhythm, and a few
 * feature switches. One settings row, read by the root layout on every render and cached with the page.
 * Defaults live here so the code never depends on the row existing.
 */

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour like #1A74A3").transform((v) => v.toLowerCase());

export const BRAND_DEFAULTS = { ink: "#333333", slate: "#384650", accent: "#359eb4", link: "#1a74a3", primary: "#00458e" } as const;

export const Brand = z.object({
  /** Charcoal: body type, headlines, strong rules, the breaking bar. */
  ink: hex.default(BRAND_DEFAULTS.ink),
  /** Slate: secondary text; every grey is a tint of it. */
  slate: hex.default(BRAND_DEFAULTS.slate),
  /** Teal: the accent (carousel timer, live dot, chart line, highlights). */
  accent: hex.default(BRAND_DEFAULTS.accent),
  /** Blue: links and eyebrow labels. */
  link: hex.default(BRAND_DEFAULTS.link),
  /** Navy: primary buttons and the darkest brand tone. */
  primary: hex.default(BRAND_DEFAULTS.primary),
});

const url = z.string().trim().max(300).refine((v) => !v || /^https?:\/\//.test(v), "Give a full https:// address").default("");

export const SiteSettings = z.object({
  brand: Brand.prefault({}),
  identity: z
    .object({
      tagline: z.string().trim().min(3).max(120).default("Find what you need. Know what matters."),
      contactEmail: z.string().trim().email().max(200).or(z.literal("")).default(""),
      whatsapp: z.string().trim().max(30).default(""),
      social: z
        .object({ x: url, facebook: url, instagram: url, youtube: url, linkedin: url, tiktok: url })
        .prefault({}),
    })
    .prefault({}),
  front: z
    .object({
      /** Slides in the homepage hero. */
      heroSlides: z.number().int().min(2).max(6).default(5),
      /** Seconds each slide stays before the carousel moves on. */
      carouselSeconds: z.number().int().min(4).max(20).default(7),
      /** Data series slugs in the order the numbers ticker shows them; anything else follows. */
      tickerOrder: z.array(z.string().trim().min(1)).max(30).default(["petrol-price", "usd-pkr", "gold-24k-tola", "gold-22k-tola", "kse-100", "diesel-price", "silver-tola", "btc-usd", "sbp-policy-rate", "kibor-1y", "aed-pkr", "sar-pkr", "gbp-pkr", "eur-pkr", "eth-usd", "cpi-yoy", "solar-panel-per-watt"]),
    })
    .prefault({}),
  features: z
    .object({
      /** Homepage strips. */
      homeCommunity: z.boolean().default(true),
      homeProfessionals: z.boolean().default(true),
      homeWorld: z.boolean().default(true),
      /** The newsletter box on the homepage and under articles. */
      newsletterCapture: z.boolean().default(true),
    })
    .prefault({}),
  updatedAt: z.string().optional(),
});
export type SiteSettingsT = z.infer<typeof SiteSettings>;
export type BrandT = z.infer<typeof Brand>;

const KEY = "site:settings";

export const DEFAULT_SETTINGS: SiteSettingsT = SiteSettings.parse({});

async function readSiteSettingsRaw(): Promise<SiteSettingsT> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, KEY) });
  const parsed = SiteSettings.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

/** Deep-merge one section; the whole row is validated before it is written. */
export async function writeSiteSettings<K extends "brand" | "identity" | "front" | "features">(section: K, value: SiteSettingsT[K]): Promise<SiteSettingsT> {
  const db = await getDb();
  const current = await readSiteSettings();
  const next = SiteSettings.parse({ ...current, [section]: value, updatedAt: new Date().toISOString() });
  await db.insert(schema.settings).values({ key: KEY, value: next }).onConflictDoUpdate({ target: schema.settings.key, set: { value: next, updatedAt: new Date() } });
  return next;
}

/** The five runtime tokens globals.css builds every colour from. */
export function brandCss(brand: BrandT): string {
  return `:root{--brand-ink:${brand.ink};--brand-slate:${brand.slate};--brand-accent:${brand.accent};--brand-link:${brand.link};--brand-primary:${brand.primary}}`;
}
/** Memoised per request: the layout, the footer and the homepage all read it in one render. */
export const readSiteSettings = cache(readSiteSettingsRaw);
