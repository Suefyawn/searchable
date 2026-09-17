import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { entitiesIn, findAndImport } from "./open-images";
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
  if (!/^https:\/\//.test(res.url)) throw new Error("Image URL redirected off https");
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
 * Only stories from the last two weeks are retried, so a hopeless query does not run forever.
 */
export async function backfillArticlePhotos(limit = 2): Promise<{ tried: number; filled: number }> {
  const db = await getDb();
  const rows = await db.query.articles.findMany({
    where: sql`${schema.articles.featuredImageUrl} is null and ${schema.articles.status} in ('published', 'scheduled') and ${schema.articles.updatedAt} > now() - interval '14 days'`,
    orderBy: [desc(schema.articles.updatedAt)],
    limit,
    columns: { id: true, title: true, kind: true, slug: true },
    with: { category: { columns: { name: true, slug: true } } },
  });
  /** A safe, generic photo subject per category, used when nothing specific matches. */
  const GENERIC: Record<string, string> = {
    cricket: "cricket ball stadium",
    sports: "sports stadium Pakistan",
    mma: "mixed martial arts octagon",
    snooker: "snooker table",
    economy: "Pakistani rupee banknotes",
    business: "Karachi skyline",
    markets: "stock exchange board",
    crypto: "bitcoin coin",
    technology: "smartphone screen",
    telecom: "mobile phone tower",
    politics: "Parliament House Islamabad",
    pakistan: "Pakistan flag",
    world: "world map",
    "united-states": "United States Capitol",
    entertainment: "cinema seats",
    health: "hospital corridor",
    education: "university library",
    property: "Lahore houses",
    auto: "cars traffic Lahore",
    energy: "power lines Pakistan",
    utilities: "electricity meter",
    taxes: "calculator documents",
    banking: "bank notes Pakistan",
    government: "Islamabad government building",
    cars: "car showroom",
    travel: "Islamabad airport",
    solar: "solar panels roof",
  };
  let filled = 0;
  for (const a of rows) {
    const tags = await db.query.articleTags.findMany({ where: eq(schema.articleTags.articleId, a.id), with: { tag: { columns: { name: true } } }, limit: 3 });
    const tagQuery = tags.map((t) => t.tag?.name).filter(Boolean).slice(0, 2).join(" ");
    const generic = GENERIC[a.category?.slug ?? ""] ?? "Pakistan";
    // Named people and bodies in the headline first (their Wikipedia photo), then the tags, then the title minus
    // numbers and small words; the generic subject last.
    const titleQuery = a.title
      .replace(/[^A-Za-z ]/g, " ")
      .replace(/\b(the|a|an|and|of|to|in|on|for|at|from|with|how|what|why|who|is|are|now|after|before|up|off|per|gets|set)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 5)
      .join(" ");
    const img = await findAndImport(tagQuery || titleQuery || generic, "article", a.title, { fallbackQuery: generic, budgetMs: 25_000, entities: entitiesIn(a.title) }).catch(() => null);
    if (!img) continue;
    await db.update(schema.articles).set({ featuredImageUrl: img.url, featuredImageAlt: a.title, featuredImageCredit: img.credit, featuredImageSourceUrl: img.sourceUrl }).where(eq(schema.articles.id, a.id));
    revalidatePath(`/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}`);
    revalidatePath("/");
    revalidatePath(a.kind === "news" ? "/news" : "/guides");
    filled += 1;
  }
  return { tried: rows.length, filled };
}
