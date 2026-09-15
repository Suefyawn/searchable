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
  const res = await fetch(`${API}/auth_tokens/token/`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "client_credentials" }), signal: AbortSignal.timeout(6_000) });
  if (!res.ok) return {};
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return { authorization: `Bearer ${cachedToken.token}` };
}

export async function searchOpenImages(query: string, opts: { limit?: number; minWidth?: number; orientation?: "landscape" | "portrait" | "square" } = {}): Promise<OpenImage[]> {
  const params = new URLSearchParams({ q: query, license: LICENSES, page_size: String(Math.min(opts.limit ?? 12, 50)), mature: "false" });
  if (opts.orientation) params.set("aspect_ratio", opts.orientation === "landscape" ? "wide" : opts.orientation === "portrait" ? "tall" : "square");
  // Openverse has bad days (502s, stalls). A slow answer must not hold a request past the function limit.
  const res = await fetch(`${API}/images/?${params}`, { headers: { "user-agent": UA, accept: "application/json", ...(await authHeader()) }, next: { revalidate: 0 }, signal: AbortSignal.timeout(8_000) });
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

/**
 * Wikimedia Commons, the fallback when Openverse is down (it has whole days of 502s). Same shape as an
 * Openverse result. Only files whose licence is CC0, public domain, CC BY or CC BY-SA are returned.
 */
export async function searchCommons(query: string, opts: { limit?: number; minWidth?: number } = {}): Promise<OpenImage[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: String(Math.min(opts.limit ?? 12, 30)),
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    iiurlwidth: "1600",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Commons search failed: ${res.status}`);
  const data = (await res.json()) as { query?: { pages?: Record<string, { title: string; imageinfo?: Array<{ url: string; thumburl?: string; descriptionurl?: string; width?: number; height?: number; mime?: string; extmetadata?: Record<string, { value?: string }> }> }> } };
  const minWidth = opts.minWidth ?? 800;
  const out: OpenImage[] = [];
  for (const page of Object.values(data.query?.pages ?? {})) {
    const ii = page.imageinfo?.[0];
    if (!ii || !/^image\/(jpeg|png|webp)$/i.test(ii.mime ?? "")) continue;
    const em = ii.extmetadata ?? {};
    const short = (em.LicenseShortName?.value ?? em.License?.value ?? "").toLowerCase();
    let license: string | null = null;
    let licenseVersion: string | null = null;
    if (/-nc|-nd|gfdl|fair use|copyright/.test(short)) license = null; // not for us
    else if (/cc0/.test(short)) license = "cc0";
    else if (/public domain|^pd/.test(short)) license = "pdm";
    else if (/cc by-sa/.test(short)) license = "by-sa";
    else if (/cc by/.test(short)) license = "by";
    if (!license) continue;
    licenseVersion = short.match(/(\d\.\d)/)?.[1] ?? null;
    if (ii.width && ii.width < minWidth) continue;
    const artist = (em.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim() || null;
    out.push({
      id: `commons:${page.title}`,
      title: page.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/_/g, " "),
      creator: artist,
      license,
      licenseVersion,
      licenseUrl: null,
      source: "wikimedia",
      sourceUrl: ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      url: ii.thumburl ?? ii.url,
      thumbnail: ii.thumburl ?? ii.url,
      width: ii.thumburl ? Math.min(1600, ii.width ?? 1600) : (ii.width ?? null),
      height: ii.height ?? null,
    });
  }
  return out;
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
  const res = await fetch(img.url, { headers: { "user-agent": UA, referer: img.sourceUrl }, signal: AbortSignal.timeout(12_000) });
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
export async function findAndImport(query: string, variant: "article" | "cover" | "photo" = "article", alt?: string, opts: { orientation?: "landscape" | "portrait" | "square"; pick?: number; fallbackQuery?: string; budgetMs?: number } = {}) {
  const attempts: Array<{ q: string; orientation?: "landscape" | "portrait" | "square"; minWidth: number }> = [
    { q: query, orientation: opts.orientation ?? "landscape", minWidth: 1000 },
    { q: query, minWidth: 800 },
    ...(opts.fallbackQuery ? [{ q: opts.fallbackQuery, orientation: "landscape" as const, minWidth: 900 }, { q: opts.fallbackQuery, minWidth: 700 }] : []),
  ];
  const deadline = Date.now() + (opts.budgetMs ?? 25_000);
  for (const a of attempts) {
    if (Date.now() > deadline) break;
    let results: OpenImage[] = [];
    try {
      results = await searchOpenImages(a.q, { limit: 10, orientation: a.orientation, minWidth: a.minWidth });
    } catch {
      // Openverse down: Commons carries the attempt.
    }
    if (!results.length) {
      try {
        results = await searchCommons(a.q, { limit: 10, minWidth: a.minWidth });
      } catch {
        continue;
      }
    }
    const ordered = opts.pick ? [...results.slice(opts.pick), ...results.slice(0, opts.pick)] : results;
    for (const candidate of ordered.slice(0, 4)) {
      if (Date.now() > deadline) break;
      try {
        return await importOpenImage(candidate, variant, alt);
      } catch {
        // dead link or unsupported file, try the next candidate
      }
    }
  }
  return null;
}
