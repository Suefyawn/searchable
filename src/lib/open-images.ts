import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { storeImage } from "./storage";

/**
 * Openly licensed photos via the Openverse API (openverse.org, aggregates Flickr, Wikimedia Commons, museums…).
 * Only CC0, public-domain and CC BY / BY-SA results are requested; every import stores the creator, licence and
 * source page so the credit line can be rendered wherever the photo appears. No AI-generated imagery.
 *
 * Anonymous limits: 20 requests/min, 200/day. Set OPENVERSE_CLIENT_ID + OPENVERSE_CLIENT_SECRET for higher limits.
 */

const API = "https://api.openverse.org/v1";
const UA = "SearchablePK/0.1 (https://searchable.pk; editorial@searchable.pk)";
const LICENSES = "cc0,pdm,by,by-sa";

export type OpenImage = {
  id: string;
  title: string;
  creator: string | null;
  license: string;
  licenseVersion: string | null;
  licenseUrl: string | null;
  source: string;
  /** Page to link the credit to (Flickr photo page, Commons file page). */
  sourceUrl: string;
  url: string;
  thumbnail: string;
  width: number | null;
  height: number | null;
};

let cachedToken: { token: string; expires: number } | null = null;

async function authHeader(): Promise<Record<string, string>> {
  const id = process.env.OPENVERSE_CLIENT_ID;
  const secret = process.env.OPENVERSE_CLIENT_SECRET;
  if (!id || !secret) return {};
  if (cachedToken && cachedToken.expires > Date.now()) return { authorization: `Bearer ${cachedToken.token}` };
  const res = await fetch(`${API}/auth_tokens/token/`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "client_credentials" }) });
  if (!res.ok) return {};
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return { authorization: `Bearer ${cachedToken.token}` };
}

export async function searchOpenImages(query: string, opts: { limit?: number; minWidth?: number; orientation?: "landscape" | "portrait" | "square" } = {}): Promise<OpenImage[]> {
  const params = new URLSearchParams({ q: query, license: LICENSES, page_size: String(Math.min(opts.limit ?? 12, 50)), mature: "false" });
  if (opts.orientation) params.set("aspect_ratio", opts.orientation === "landscape" ? "wide" : opts.orientation === "portrait" ? "tall" : "square");
  const res = await fetch(`${API}/images/?${params}`, { headers: { "user-agent": UA, accept: "application/json", ...(await authHeader()) }, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Openverse search failed: ${res.status}`);
  const data = (await res.json()) as { results: Array<Record<string, unknown>> };
  const minWidth = opts.minWidth ?? 800;
  return data.results
    .map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      creator: (r.creator as string | null) ?? null,
      license: String(r.license),
      licenseVersion: (r.license_version as string | null) ?? null,
      licenseUrl: (r.license_url as string | null) ?? null,
      source: String(r.source ?? r.provider ?? ""),
      sourceUrl: String(r.foreign_landing_url ?? ""),
      url: String(r.url),
      thumbnail: String(r.thumbnail ?? r.url),
      width: (r.width as number | null) ?? null,
      height: (r.height as number | null) ?? null,
    }))
    .filter((r) => !r.width || r.width >= minWidth)
    .filter((r) => /\.(jpe?g|png|webp)(\?|$)/i.test(r.url) || !/\.(gif|svg|tiff?)(\?|$)/i.test(r.url));
}

const SOURCE_NAMES: Record<string, string> = { flickr: "Flickr", wikimedia: "Wikimedia Commons", stocksnap: "StockSnap", rawpixel: "Rawpixel", smithsonian: "Smithsonian", met: "The Met", nasa: "NASA", europeana: "Europeana" };

export function creditLine(img: Pick<OpenImage, "creator" | "license" | "licenseVersion" | "source">): string {
  const lic = img.license === "pdm" ? "Public domain" : img.license === "cc0" ? "CC0" : `CC ${img.license.toUpperCase()}${img.licenseVersion ? ` ${img.licenseVersion}` : ""}`;
  // Some Flickr accounts stuff licence boilerplate into the name; keep the first line, no markup, 60 chars.
  const raw = (img.creator ?? "").replace(/<[^>]+>/g, "").split(String.fromCharCode(10))[0].split(String.fromCharCode(13))[0].trim();
  const by = (raw.length > 60 ? `${raw.slice(0, 57).trimEnd()}…` : raw) || "Unknown photographer";
  return `${by} / ${SOURCE_NAMES[img.source] ?? img.source}, ${lic}`;
}

/** Download an Openverse result, normalise it through the storage adapter, and record licence + source. */
export async function importOpenImage(img: OpenImage, variant: "article" | "cover" | "photo" = "article", alt?: string) {
  const res = await fetch(img.url, { headers: { "user-agent": UA, referer: img.sourceUrl } });
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > 25 * 1024 * 1024) throw new Error("Image too large");
  const credit = creditLine(img);
  const stored = await storeImage(buf, { variant, alt: alt ?? img.title, credit });
  const db = await getDb();
  await db.update(schema.media).set({ license: img.license, licenseVersion: img.licenseVersion, sourceUrl: img.sourceUrl }).where(eq(schema.media.id, stored.id));
  return { ...stored, credit, sourceUrl: img.sourceUrl, license: img.license };
}

/**
 * First usable result for a query, used by the seed to give pages a real photo. Tries wide, then any
 * orientation, then a relaxed width; skips candidates whose file no longer downloads.
 */
export async function findAndImport(query: string, variant: "article" | "cover" | "photo" = "article", alt?: string, opts: { orientation?: "landscape" | "portrait" | "square"; pick?: number; fallbackQuery?: string } = {}) {
  const attempts: Array<{ q: string; orientation?: "landscape" | "portrait" | "square"; minWidth: number }> = [
    { q: query, orientation: opts.orientation ?? "landscape", minWidth: 1000 },
    { q: query, minWidth: 800 },
    ...(opts.fallbackQuery ? [{ q: opts.fallbackQuery, orientation: "landscape" as const, minWidth: 900 }, { q: opts.fallbackQuery, minWidth: 700 }] : []),
  ];
  for (const a of attempts) {
    const results = await searchOpenImages(a.q, { limit: 10, orientation: a.orientation, minWidth: a.minWidth });
    const ordered = opts.pick ? [...results.slice(opts.pick), ...results.slice(0, opts.pick)] : results;
    for (const candidate of ordered.slice(0, 4)) {
      try {
        return await importOpenImage(candidate, variant, alt);
      } catch {
        // dead link or unsupported file, try the next candidate
      }
    }
  }
  return null;
}
