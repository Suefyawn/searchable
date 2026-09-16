/*
 * Earthquakes in and around Pakistan from the USGS event feed (public domain, no key). The box covers
 * Pakistan, Afghanistan, eastern Iran, western India and the Hindu Kush, where the tremors felt in
 * Pakistani cities come from. One request every ten minutes through the fetch cache.
 */

export type Quake = { id: string; mag: number; place: string; at: Date; depthKm: number; lat: number; lng: number; url: string; felt: number | null; nearest: { city: string; km: number } | null };

const UA = "searchable.pk earthquake page (jetnine.inc@gmail.com)";
const BOX = "minlatitude=22&maxlatitude=39&minlongitude=58&maxlongitude=80";

/** Great-circle distance, kilometres. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

type Feature = { id: string; properties: { mag: number | null; place: string | null; time: number; url: string; felt: number | null }; geometry: { coordinates: [number, number, number] } };

export async function fetchQuakes(cities: { name: string; lat: number; lng: number }[], opts: { days?: number; minMag?: number } = {}): Promise<Quake[] | null> {
  const start = new Date(Date.now() - (opts.days ?? 30) * 86_400_000).toISOString().slice(0, 10);
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&${BOX}&starttime=${start}&minmagnitude=${opts.minMag ?? 2.5}&orderby=time&limit=200`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { "user-agent": UA }, next: { revalidate: 600 } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as { features: Feature[] };
  return json.features
    .filter((f) => f.properties.mag !== null)
    .map((f) => {
      const [lng, lat, depth] = f.geometry.coordinates;
      let nearest: Quake["nearest"] = null;
      for (const c of cities) {
        const km = distanceKm(lat, lng, c.lat, c.lng);
        if (!nearest || km < nearest.km) nearest = { city: c.name, km };
      }
      return { id: f.id, mag: f.properties.mag!, place: f.properties.place ?? "", at: new Date(f.properties.time), depthKm: Math.round(depth), lat, lng, url: f.properties.url, felt: f.properties.felt, nearest };
    });
}

/** Plain words for a magnitude, the way people ask "was it big?". */
export function describeMag(m: number): string {
  if (m >= 7) return "Major";
  if (m >= 6) return "Strong";
  if (m >= 5) return "Moderate";
  if (m >= 4) return "Light";
  return "Minor";
}
