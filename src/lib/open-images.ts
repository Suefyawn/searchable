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

/** After a failure, Openverse is skipped for ten minutes so Commons gets the request's time budget. */
let openverseDownUntil = 0;

export async function searchOpenImages(query: string, opts: { limit?: number; minWidth?: number; orientation?: "landscape" | "portrait" | "square" } = {}): Promise<OpenImage[]> {
  if (Date.now() < openverseDownUntil) throw new Error("Openverse marked down");
  const params = new URLSearchParams({ q: query, license: LICENSES, page_size: String(Math.min(opts.limit ?? 12, 50)), mature: "false" });
  if (opts.orientation) params.set("aspect_ratio", opts.orientation === "landscape" ? "wide" : opts.orientation === "portrait" ? "tall" : "square");
  // Openverse has bad days (502s, stalls). A slow answer must not hold a request past the function limit.
  let res: Response;
  try {
    res = await fetch(`${API}/images/?${params}`, { headers: { "user-agent": UA, accept: "application/json", ...(await authHeader()) }, next: { revalidate: 0 }, signal: AbortSignal.timeout(8_000) });
  } catch (e) {
    openverseDownUntil = Date.now() + 10 * 60_000;
    throw e;
  }
  if (!res.ok) {
    if (res.status >= 500) openverseDownUntil = Date.now() + 10 * 60_000;
    throw new Error(`Openverse search failed: ${res.status}`);
  }
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

type CommonsPage = { title: string; imageinfo?: Array<{ url: string; thumburl?: string; descriptionurl?: string; width?: number; height?: number; mime?: string; extmetadata?: Record<string, { value?: string }> }> };

const STOPWORDS = new Set(["the", "and", "for", "with", "from", "into", "over", "after", "before", "under", "about", "than", "that", "this", "what", "when", "where", "which", "who", "why", "how", "are", "was", "were", "has", "have", "had", "his", "her", "its", "their", "you", "your", "our", "new", "now", "set", "get", "gets", "off", "out", "per", "via", "not"]);

/** Query words that carry meaning: three letters or more, not a stopword. */
export function queryWords(query: string): string[] {
  return Array.from(new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w))));
}

/**
 * Does a file's text (title, description, categories) describe the query? Commons full-text search is loose:
 * "MMA" once found the Metropolitan Museum of Art and "rupee" a 1947 banknote. A one- or two-word query must
 * match in full; longer ones need at least half their words, two at minimum.
 */
export function isRelevant(hay: string, query: string): boolean {
  const words = queryWords(query);
  if (!words.length) return true;
  const h = hay.toLowerCase();
  const matched = words.filter((w) => h.includes(w)).length;
  const need = words.length <= 2 ? words.length : Math.max(2, Math.ceil(words.length / 2));
  return matched >= need;
}

/** Files that are never a news photo: paintings, maps, diagrams, logos, scans, documents. */
const NOT_A_PHOTO = /\b(painting|paintings|engraving|lithograph|drawing|drawings|map of|maps of|diagram|chart|logo|logos|coat of arms|emblem|seal of|scan|scanned|manuscript|document|poster|banknote|stamp|postage|screenshot|icon)\b/i;

/**
 * A Commons file as an OpenImage, or null when it is not a usable photo: wrong type, too small, a licence we
 * cannot use (NC, ND, GFDL only, fair use), or one that reads as a painting, map, diagram or document.
 * News stories also skip photos taken before 2000 unless `allowOld` is set.
 */
function parseCommonsPage(page: CommonsPage, opts: { minWidth: number; allowOld?: boolean; allowPng?: boolean }): OpenImage | null {
  const ii = page.imageinfo?.[0];
  if (!ii) return null;
  if (!(opts.allowPng ? /^image\/(jpeg|png|webp)$/i : /^image\/(jpeg|webp)$/i).test(ii.mime ?? "")) return null;
  const em = ii.extmetadata ?? {};
  const text = `${page.title} ${em.ImageDescription?.value ?? ""} ${em.Categories?.value ?? ""}`.replace(/<[^>]+>/g, " ");
  if (NOT_A_PHOTO.test(text)) return null;
  const year = Number((em.DateTimeOriginal?.value ?? "").match(/\b(1[89]\d\d|20\d\d)\b/)?.[1] ?? 0);
  if (!opts.allowOld && year && year < 2000) return null;
  const short = (em.LicenseShortName?.value ?? em.License?.value ?? "").toLowerCase();
  let license: string | null = null;
  if (/-nc|-nd|gfdl|fair use|copyright/.test(short)) license = null; // not for us
  else if (/cc0/.test(short)) license = "cc0";
  else if (/public domain|^pd/.test(short)) license = "pdm";
  else if (/cc by-sa/.test(short)) license = "by-sa";
  else if (/cc by/.test(short)) license = "by";
  if (!license) return null;
  if (ii.width && ii.width < opts.minWidth) return null;
  const artist = (em.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim() || null;
  return {
    id: `commons:${page.title}`,
    title: page.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/_/g, " "),
    creator: artist,
    license,
    licenseVersion: short.match(/(\d\.\d)/)?.[1] ?? null,
    licenseUrl: null,
    source: "wikimedia",
    sourceUrl: ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
    url: ii.thumburl ?? ii.url,
    thumbnail: ii.thumburl ?? ii.url,
    width: ii.thumburl ? Math.min(1600, ii.width ?? 1600) : (ii.width ?? null),
    height: ii.height ?? null,
  };
}

const COMMONS_FILE_PROPS = { prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiextmetadatafilter: "LicenseShortName|License|Artist|ImageDescription|Categories|DateTimeOriginal", iiurlwidth: "1600", format: "json", origin: "*" };

/**
 * Wikimedia Commons, the fallback when Openverse is down (it has whole days of 502s). Same shape as an
 * Openverse result. Only files whose licence is CC0, public domain, CC BY or CC BY-SA are returned, only
 * photographs, and only ones whose own text matches the query (see isRelevant).
 */
export async function searchCommons(query: string, opts: { limit?: number; minWidth?: number } = {}): Promise<OpenImage[]> {
  const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: "6", gsrlimit: String(Math.min(opts.limit ?? 12, 30)), ...COMMONS_FILE_PROPS });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Commons search failed: ${res.status}`);
  const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const out: OpenImage[] = [];
  for (const page of Object.values(data.query?.pages ?? {})) {
    const em = page.imageinfo?.[0]?.extmetadata ?? {};
    if (!isRelevant(`${page.title} ${em.ImageDescription?.value ?? ""} ${em.Categories?.value ?? ""}`, query)) continue;
    const img = parseCommonsPage(page, { minWidth: opts.minWidth ?? 800 });
    if (img) out.push(img);
  }
  return out;
}

/**
 * The lead photo of the English Wikipedia article for a named thing (a cricketer, a fighter, a minister, a
 * company, a stadium): the most relevant openly licensed photo there is for a story about them. Wikipedia only
 * reports free images here (pilicense defaults to free); the file is then read from Commons for its licence
 * and credit. Disambiguation pages and pages without a photo return null. A smaller minimum width than a
 * search result: a 600 px portrait of the right person beats a 1600 px photo of the wrong thing.
 */
export async function wikipediaLeadImage(name: string, opts: { minWidth?: number } = {}): Promise<OpenImage | null> {
  const params = new URLSearchParams({ action: "query", prop: "pageimages|pageprops", piprop: "name", ppprop: "disambiguation", titles: name, redirects: "1", format: "json" });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = (await res.json()) as { query?: { pages?: Record<string, { pageimage?: string; pageprops?: { disambiguation?: string } }> } };
  const page = Object.values(data.query?.pages ?? {})[0];
  const file = page?.pageimage;
  if (!file || page.pageprops?.disambiguation !== undefined) return null;
  if (!/\.(jpe?g|webp)$/i.test(file)) return null; // logos and flags are SVG or PNG
  const fparams = new URLSearchParams({ action: "query", titles: `File:${file}`, ...COMMONS_FILE_PROPS });
  const fres = await fetch(`https://commons.wikimedia.org/w/api.php?${fparams}`, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } });
  if (!fres.ok) return null;
  const fdata = (await fres.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const fpage = Object.values(fdata.query?.pages ?? {})[0];
  return fpage ? parseCommonsPage(fpage, { minWidth: opts.minWidth ?? 500, allowOld: true }) : null;
}

/**
 * Named things in a headline worth looking up on Wikipedia: runs of two or more capitalised words ("Tom
 * Aspinall", "Ciryl Gane", "State Bank") and all-caps abbreviations of three letters or more (PSX, FBR,
 * OGRA). The sentence-initial word only counts when it starts such a run.
 */
export function entitiesIn(title: string): string[] {
  const out: string[] = [];
  const cleaned = title.replace(/[^A-Za-z0-9' -]/g, " | ");
  for (const chunk of cleaned.split("|")) {
    const words = chunk.trim().split(/\s+/).filter(Boolean);
    let run: string[] = [];
    const flush = () => {
      if (run.length >= 2) out.push(run.join(" "));
      run = [];
    };
    for (const w of words) {
      if (/^[A-Z][a-z'-]+$/.test(w) || /^[A-Z][a-z]+-[A-Z][a-z]+$/.test(w)) run.push(w);
      else {
        flush();
        if (/^[A-Z]{3,}$/.test(w)) out.push(w);
      }
    }
    flush();
  }
  return Array.from(new Set(out.filter((e) => !STOPWORDS.has(e.toLowerCase()))));
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
 * Candidates for a picker or the API: the Wikipedia lead photo of any named entity first, then Openverse,
 * then Commons when Openverse is down or empty. Never throws; an outage just means fewer candidates.
 */
export async function searchPhotos(query: string, opts: { limit?: number; minWidth?: number; orientation?: "landscape" | "portrait" | "square"; entities?: string[] } = {}): Promise<OpenImage[]> {
  const out: OpenImage[] = [];
  for (const name of (opts.entities ?? []).slice(0, 3)) {
    const img = await wikipediaLeadImage(name).catch(() => null);
    if (img) out.push(img);
  }
  let rest: OpenImage[] = [];
  try {
    rest = await searchOpenImages(query, { limit: opts.limit, minWidth: opts.minWidth, orientation: opts.orientation });
  } catch {
    // Openverse down
  }
  if (!rest.length) rest = await searchCommons(query, { limit: opts.limit, minWidth: opts.minWidth }).catch(() => []);
  return [...out, ...rest.filter((r) => !out.some((o) => o.url === r.url))];
}

/**
 * First usable photo for a story: the Wikipedia lead photo of any named entity, then a search for the query
 * (wide, then any orientation), then the fallback query; skips candidates whose file no longer downloads.
 */
export async function findAndImport(query: string, variant: "article" | "cover" | "photo" = "article", alt?: string, opts: { orientation?: "landscape" | "portrait" | "square"; pick?: number; fallbackQuery?: string; budgetMs?: number; /** Named people, teams, places or organisations: their Wikipedia lead photo is tried before any search. */ entities?: string[] } = {}) {
  const deadline = Date.now() + (opts.budgetMs ?? 25_000);
  for (const name of (opts.entities ?? []).slice(0, 3)) {
    if (Date.now() > deadline) break;
    try {
      const img = await wikipediaLeadImage(name);
      if (img) return await importOpenImage(img, variant, alt);
    } catch {
      // no page, no photo or a dead file: fall through to the searches
    }
  }
  const attempts: Array<{ q: string; orientation?: "landscape" | "portrait" | "square"; minWidth: number }> = [
    { q: query, orientation: opts.orientation ?? "landscape", minWidth: 1000 },
    { q: query, minWidth: 800 },
    ...(opts.fallbackQuery ? [{ q: opts.fallbackQuery, orientation: "landscape" as const, minWidth: 900 }, { q: opts.fallbackQuery, minWidth: 700 }] : []),
  ];
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
