import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ApiError, withAdminApi } from "@/lib/admin-api";
import { RENDITION_WIDTHS } from "@/lib/images";
import { importImageFromUrl } from "@/lib/media-import";
import { entitiesIn, findAndImport, searchPhotos, usedSources } from "@/lib/open-images";
import { heavyComputeAllowed } from "@/lib/platform";
import { storePreparedImage } from "@/lib/storage";

export const dynamic = "force-dynamic";
// Photo imports, ingestion and sends take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

const Body = z.union([
  z.object({ search: z.string().min(2).max(120), orientation: z.enum(["landscape", "portrait", "square"]).optional(), entities: z.array(z.string().min(2).max(80)).max(4).optional() }),
  z.object({ query: z.string().min(2).max(120), alt: z.string().max(300).optional(), fallbackQuery: z.string().max(120).optional(), variant: z.enum(["article", "cover", "photo"]).default("article") }),
  z.object({ url: z.string().url(), alt: z.string().max(300).optional(), credit: z.string().max(200).optional(), sourceUrl: z.string().url().optional(), license: z.string().max(40).optional(), variant: z.enum(["article", "cover", "photo", "logo"]).default("article") }),
]);

/** Text fields of the multipart form; the three files travel beside them. */
const Prepared = z.object({
  alt: z.string().max(300).optional(),
  credit: z.string().max(200).optional(),
  sourceUrl: z.string().url().optional(),
  license: z.string().max(40).optional(),
  variant: z.enum(["article", "cover", "photo", "logo"]).default("article"),
});

const NO_RESIZE = "This server does not resize images. Download the photo, make the master and the 960 and 480 px WebP renditions yourself, and POST them here as multipart/form-data (fields master, r960, r480, alt, credit, sourceUrl, license, variant); then use the returned url.";

/**
 * POST /api/admin/media
 *   JSON { search, entities? }          list openly licensed candidates: Wikipedia photo of each entity, Openverse, Commons (no import)
 *   JSON { query, alt? }                import the first usable Openverse photo for the query (servers that may resize only)
 *   JSON { url, alt?, credit?, ... }    import an image you already know is openly licensed (servers that may resize only)
 *   multipart master, r960, r480 (+ alt, credit, sourceUrl, license, variant)   store renditions the caller prepared (ADR-43)
 * Returns the stored URL (with 480/960 renditions alongside) and the credit line to show.
 */
export const POST = withAdminApi(async (_req, { body }) => {
  if (body instanceof FormData) {
    const d = Prepared.parse(Object.fromEntries([...body.entries()].filter(([, v]) => typeof v === "string")));
    const master = body.get("master");
    const files = RENDITION_WIDTHS.map((w) => body.get(`r${w}`));
    if (!(master instanceof File) || !files.every((f) => f instanceof File)) throw new ApiError(400, "Send master, r960 and r480 as files");
    const bytes = async (f: File) => new Uint8Array(await f.arrayBuffer());
    const renditions = Object.fromEntries(await Promise.all(RENDITION_WIDTHS.map(async (w, i) => [w, await bytes(files[i] as File)]))) as Record<(typeof RENDITION_WIDTHS)[number], Uint8Array>;
    let stored;
    try {
      stored = await storePreparedImage({ master: await bytes(master), renditions }, { variant: d.variant, alt: d.alt, credit: d.credit });
    } catch (e) {
      throw new ApiError(400, (e as Error).message);
    }
    if (d.license || d.sourceUrl) {
      const db = await getDb();
      await db.update(schema.media).set({ license: d.license ?? null, sourceUrl: d.sourceUrl ?? null }).where(eq(schema.media.id, stored.id));
    }
    return { ok: true, image: { ...stored, credit: d.credit ?? null, sourceUrl: d.sourceUrl ?? null, license: d.license ?? null } };
  }
  const d = Body.parse(body);
  if ("search" in d) {
    // Candidates the site already uses are flagged so the task picks something fresh.
    const candidates = await searchPhotos(d.search, { limit: 12, orientation: d.orientation, minWidth: 800, entities: d.entities ?? entitiesIn(d.search) });
    const used = await usedSources(candidates);
    return { candidates: candidates.map((c) => ({ ...c, alreadyUsed: used.has(c.sourceUrl) })) };
  }
  if (!heavyComputeAllowed) throw new ApiError(400, NO_RESIZE);
  if ("query" in d) {
    const img = await findAndImport(d.query, d.variant, d.alt, { fallbackQuery: d.fallbackQuery });
    if (!img) throw new ApiError(404, `No openly licensed photo found for "${d.query}"`);
    return { ok: true, image: img };
  }
  const img = await importImageFromUrl(d.url, { variant: d.variant, alt: d.alt, credit: d.credit, sourceUrl: d.sourceUrl, license: d.license });
  return { ok: true, image: { ...img, credit: d.credit ?? null, sourceUrl: d.sourceUrl ?? d.url } };
});
