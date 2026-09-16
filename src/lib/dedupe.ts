import { and, eq, ne, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

/**
 * Duplicate detection for businesses. Three signals, strongest first:
 *  1. same normalised phone / WhatsApp anywhere
 *  2. same name key in the same city (punctuation, legal suffixes and the city name stripped)
 *  3. similar name (Dice coefficient ≥ 0.8) within 300 m, or ≥ 0.9 in the same city without coordinates
 */

/**
 * Pakistani numbers → +92XXXXXXXXXX. Landlines keep their city code. A trailing line range ("35401620-6",
 * "35963421-30") is dropped, since it is not part of the number. Nine or ten national digits are valid
 * (mobiles are ten; landlines are a two- or three-digit city code plus six to eight), plus eleven-digit UANs.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/[\s-]+(\d{1,2})$/, (m, tail: string) => (raw.replace(/\D/g, "").length - tail.length >= 9 ? "" : m));
  let d = trimmed.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0092")) d = d.slice(4);
  else if (d.startsWith("92") && d.length >= 11) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1); // "+92-042-..." keeps the trunk zero by mistake
  // UANs (city code + 111 + six digits, e.g. 051 111 644 911) are the one valid eleven-digit form.
  const uan = d.length === 11 && /^\d{2,3}111\d{6}$/.test(d);
  if (d.length < 9 || (d.length > 10 && !uan)) return null;
  return `+92${d}`;
}

const STOP = new Set(["the", "and", "&", "pvt", "private", "ltd", "limited", "co", "company", "inc", "llc", "shop", "store", "centre", "center", "of", "al", "restaurant", "hotel", "clinic", "hospital", "solar", "solutions", "services", "traders", "enterprises"]);

/** Comparable key for a business name. Optionally removes the city/area name too. */
export function nameKey(name: string, ...drop: (string | null | undefined)[]): string {
  let s = name.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ");
  for (const d of drop) if (d) s = s.replace(new RegExp(`\\b${d.toLowerCase().replace(/[^a-z0-9 ]/g, "")}\\b`, "g"), " ");
  return s
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(" ")
    .trim();
}

/** Sørensen–Dice similarity on character bigrams, 0..1. */
export function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const g = new Map<string, number>();
    const t = s.replace(/\s+/g, " ");
    for (let i = 0; i < t.length - 1; i++) g.set(t.slice(i, i + 2), (g.get(t.slice(i, i + 2)) ?? 0) + 1);
    return g;
  };
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ga = grams(a);
  const gb = grams(b);
  let inter = 0;
  for (const [k, n] of ga) inter += Math.min(n, gb.get(k) ?? 0);
  const total = [...ga.values()].reduce((s, n) => s + n, 0) + [...gb.values()].reduce((s, n) => s + n, 0);
  return total ? (2 * inter) / total : 0;
}

export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type DuplicateMatch = { id: string; slug: string; name: string; status: string; reason: "phone" | "name" | "similar"; score: number };

export type Candidate = { name: string; phone?: string | null; whatsapp?: string | null; cityId?: string | null; cityName?: string | null; lat?: number | null; lng?: number | null; excludeId?: string | null };

export async function findDuplicates(c: Candidate): Promise<DuplicateMatch[]> {
  const db = await getDb();
  const out = new Map<string, DuplicateMatch>();
  const phones = [normalizePhone(c.phone), normalizePhone(c.whatsapp)].filter((p): p is string => !!p);
  const notSelf = c.excludeId ? ne(schema.businesses.id, c.excludeId) : undefined;

  if (phones.length) {
    const tails = phones.map((p) => p.slice(-9));
    const rows = await db
      .select({ id: schema.businesses.id, slug: schema.businesses.slug, name: schema.businesses.name, status: schema.businesses.status })
      .from(schema.businesses)
      .where(and(notSelf, or(...tails.flatMap((t) => [sql`regexp_replace(coalesce(${schema.businesses.phone}, ''), '\\D', '', 'g') like ${"%" + t}`, sql`regexp_replace(coalesce(${schema.businesses.whatsapp}, ''), '\\D', '', 'g') like ${"%" + t}`]))))
      .limit(10);
    for (const r of rows) out.set(r.id, { ...r, reason: "phone", score: 1 });
  }

  if (c.cityId) {
    const key = nameKey(c.name, c.cityName);
    if (key.length >= 3) {
      const rows = await db
        .select({ id: schema.businesses.id, slug: schema.businesses.slug, name: schema.businesses.name, status: schema.businesses.status, lat: schema.businesses.lat, lng: schema.businesses.lng })
        .from(schema.businesses)
        .where(and(eq(schema.businesses.cityId, c.cityId), notSelf, ne(schema.businesses.status, "duplicate")))
        .limit(2000);
      for (const r of rows) {
        if (out.has(r.id)) continue;
        const rk = nameKey(r.name, c.cityName);
        if (rk === key) {
          out.set(r.id, { id: r.id, slug: r.slug, name: r.name, status: r.status, reason: "name", score: 0.95 });
          continue;
        }
        const s = similarity(key, rk);
        const near = c.lat != null && c.lng != null && r.lat != null && r.lng != null ? distanceMetres(c.lat, c.lng, r.lat, r.lng) < 300 : false;
        if ((near && s >= 0.8) || s >= 0.9) out.set(r.id, { id: r.id, slug: r.slug, name: r.name, status: r.status, reason: "similar", score: s });
      }
    }
  }
  return [...out.values()].sort((a, b) => b.score - a.score).slice(0, 5);
}
