import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { findAndImport } from "./open-images";
import { storeImage } from "./storage";

const MAX_BYTES = 25 * 1024 * 1024;
const UA = "Searchable.pk image importer (+https://searchable.pk)";

/**
 * Fetch an openly licensed image by URL and store it like an upload (renditions, media row, credit).
 * Used by the admin API when the automation already knows the photo it wants (Wikimedia Commons, a press
 * kit, a government release). Licence and source are recorded on the media row for the credits page.
 */
export async function importImageFromUrl(url: string, opts: { variant?: "article" | "cover" | "photo" | "logo"; alt?: string; credit?: string; sourceUrl?: string; license?: string }) {
  if (!/^https:\/\//.test(url)) throw new Error("Image URL must be https");
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!/^image\/(jpeg|png|webp|gif|avif)/.test(type)) throw new Error(`Not an image (${type || "unknown type"})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("Image larger than 25 MB");
  const stored = await storeImage(buf, { variant: opts.variant ?? "article", alt: opts.alt, credit: opts.credit });
  if (opts.license || opts.sourceUrl) {
    const db = await getDb();
    await db.update(schema.media).set({ license: opts.license ?? null, sourceUrl: opts.sourceUrl ?? url }).where(eq(schema.media.id, stored.id));
  }
  return stored;
}

/**
 * Stories published without a photo (Openverse was down, the search found nothing) get another try later:
 * the job runner calls this every few minutes and handles two at a time so it never eats the request budget.
 * Only stories from the last three days are retried, so a hopeless query does not run forever.
 */
export async function backfillArticlePhotos(limit = 2): Promise<{ tried: number; filled: number }> {
  const db = await getDb();
  const rows = await db.query.articles.findMany({
    where: sql`${schema.articles.featuredImageUrl} is null and ${schema.articles.status} in ('published', 'scheduled') and ${schema.articles.updatedAt} > now() - interval '3 days'`,
    orderBy: [desc(schema.articles.updatedAt)],
    limit,
    columns: { id: true, title: true, kind: true, slug: true },
    with: { category: { columns: { name: true, slug: true } } },
  });
  let filled = 0;
  for (const a of rows) {
    // The title minus numbers and punctuation is a fair photo query; the category is the fallback.
    const query = a.title
      .replace(/[^A-Za-z ]/g, " ")
      .replace(/\b(the|a|an|and|of|to|in|on|for|at|from|with|how|what|why|who|is|are|now|after|before|up|off|per|gets|set)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 5)
      .join(" ");
    const img = await findAndImport(query || `${a.category?.name ?? "Pakistan"}`, "article", a.title, { fallbackQuery: `${a.category?.name ?? "Pakistan"} Pakistan`, budgetMs: 20_000 }).catch(() => null);
    if (!img) continue;
    await db.update(schema.articles).set({ featuredImageUrl: img.url, featuredImageAlt: a.title, featuredImageCredit: img.credit, featuredImageSourceUrl: img.sourceUrl }).where(eq(schema.articles.id, a.id));
    revalidatePath(`/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}`);
    revalidatePath("/");
    revalidatePath(a.kind === "news" ? "/news" : "/guides");
    filled += 1;
  }
  return { tried: rows.length, filled };
}
