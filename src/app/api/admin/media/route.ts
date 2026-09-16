import { z } from "zod";
import { ApiError, withAdminApi } from "@/lib/admin-api";
import { importImageFromUrl } from "@/lib/media-import";
import { entitiesIn, findAndImport, searchPhotos, usedSources } from "@/lib/open-images";

export const dynamic = "force-dynamic";
// Photo imports, ingestion and sends take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

const Body = z.union([
  z.object({ search: z.string().min(2).max(120), orientation: z.enum(["landscape", "portrait", "square"]).optional(), entities: z.array(z.string().min(2).max(80)).max(4).optional() }),
  z.object({ query: z.string().min(2).max(120), alt: z.string().max(300).optional(), fallbackQuery: z.string().max(120).optional(), variant: z.enum(["article", "cover", "photo"]).default("article") }),
  z.object({ url: z.string().url(), alt: z.string().max(300).optional(), credit: z.string().max(200).optional(), sourceUrl: z.string().url().optional(), license: z.string().max(40).optional(), variant: z.enum(["article", "cover", "photo", "logo"]).default("article") }),
]);

/**
 * POST /api/admin/media
 *   { search, entities? }          list openly licensed candidates: Wikipedia photo of each entity, Openverse, Commons (no import)
 *   { query, alt? }                import the first usable Openverse photo for the query
 *   { url, alt?, credit?, ... }    import an image you already know is openly licensed
 * Returns the stored URL (with 480/960 renditions alongside) and the credit line to show.
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  if ("search" in d) {
    // Candidates the site already uses are flagged so the task picks something fresh.
    const candidates = await searchPhotos(d.search, { limit: 12, orientation: d.orientation, minWidth: 800, entities: d.entities ?? entitiesIn(d.search) });
    const used = await usedSources(candidates);
    return { candidates: candidates.map((c) => ({ ...c, alreadyUsed: used.has(c.sourceUrl) })) };
  }
  if ("query" in d) {
    const img = await findAndImport(d.query, d.variant, d.alt, { fallbackQuery: d.fallbackQuery });
    if (!img) throw new ApiError(404, `No openly licensed photo found for "${d.query}"`);
    return { ok: true, image: img };
  }
  const img = await importImageFromUrl(d.url, { variant: d.variant, alt: d.alt, credit: d.credit, sourceUrl: d.sourceUrl, license: d.license });
  return { ok: true, image: { ...img, credit: d.credit ?? null, sourceUrl: d.sourceUrl ?? d.url } };
});
