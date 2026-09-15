import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { removeSearchDocument } from "./search";

export type SampleSeed = { articles: string[]; businesses: string[]; seededAt?: string };

/** The demonstration set the seed created, if it is still on the site. */
export async function readSampleSeed(): Promise<SampleSeed | null> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, "seed:sample") });
  return (row?.value as SampleSeed | undefined) ?? null;
}

/**
 * Delete the demonstration articles and businesses the sample seed created (comments, reviews and photos
 * cascade), then forget the list. Real content published since is untouched: the list is by slug, and a
 * story that was rewritten and moved no longer matches.
 */
export async function removeSampleContent(): Promise<{ articles: number; businesses: number }> {
  const db = await getDb();
  const sample = await readSampleSeed();
  if (!sample) return { articles: 0, businesses: 0 };
  let articles = 0;
  let businesses = 0;
  if (sample.articles.length) {
    const gone = await db.delete(schema.articles).where(inArray(schema.articles.slug, sample.articles)).returning({ id: schema.articles.id, kind: schema.articles.kind });
    for (const g of gone) await removeSearchDocument(g.kind === "news" ? "news" : "guide", g.id);
    articles = gone.length;
  }
  if (sample.businesses.length) {
    const gone = await db.delete(schema.businesses).where(inArray(schema.businesses.slug, sample.businesses)).returning({ id: schema.businesses.id });
    for (const g of gone) await removeSearchDocument("business", g.id);
    businesses = gone.length;
  }
  await db.delete(schema.settings).where(eq(schema.settings.key, "seed:sample"));
  revalidatePath("/", "layout");
  return { articles, businesses };
}
