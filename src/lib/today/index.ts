import { listCities } from "@/db/queries/geo";

/** Civil date and clock in Pakistan Standard Time (UTC+5, no daylight saving). */
export function nowInPakistan(at = new Date()): { y: number; m: number; d: number; hours: number; iso: string; date: Date } {
  const shifted = new Date(at.getTime() + 5 * 3_600_000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  return { y, m, d, hours: shifted.getUTCHours() + shifted.getUTCMinutes() / 60, iso: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, date: at };
}

/** Add days to a civil date (UTC arithmetic on a noon instant so no DST edge can bite). */
export function addDays(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(y, m - 1, d, 12) + days * 86_400_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export type TodayCity = { slug: string; name: string; lat: number; lng: number; population: number | null };

/** Cities with coordinates, biggest first: the ones that get weather and prayer pages. */
export async function todayCities(): Promise<TodayCity[]> {
  const rows = await listCities();
  return rows.filter((c): c is typeof c & { lat: number; lng: number } => typeof c.lat === "number" && typeof c.lng === "number").map((c) => ({ slug: c.slug, name: c.name, lat: c.lat, lng: c.lng, population: c.population ?? null }));
}

export async function todayCity(slug: string): Promise<TodayCity | null> {
  return (await todayCities()).find((c) => c.slug === slug) ?? null;
}
