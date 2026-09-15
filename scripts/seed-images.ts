import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { assertDevServerStopped } from "./_guard";
import { ARTICLE_IMAGES, CATEGORY_IMAGES, CITY_IMAGES } from "./seed-data/images";
import { getDb, schema } from "../src/db";
import { findAndImport } from "../src/lib/open-images";

/**
 * Give seed articles, cities and business categories real, openly licensed photos from Openverse.
 * Idempotent: rows that already have an image are skipped. Anonymous Openverse limit is 20 req/min,
 * so this paces itself (~65 lookups ≈ 4 minutes). Run: npx tsx scripts/seed-images.ts [--only=articles|cities|categories]
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const redo = new Set((process.argv.find((a) => a.startsWith("--redo="))?.split("=")[1] ?? "").split(",").filter(Boolean));
const PACE_MS = 3_200;

async function main() {
  await assertDevServerStopped();
  const db = await getDb();
  // --redo=slug,slug: clear those images first so they are re-picked with the current query.
  for (const slug of redo) {
    await db.update(schema.articles).set({ featuredImageUrl: null, featuredImageCredit: null, featuredImageSourceUrl: null }).where(eq(schema.articles.slug, slug));
    await db.update(schema.locations).set({ imageUrl: null, imageCredit: null }).where(and(eq(schema.locations.kind, "city"), eq(schema.locations.slug, slug)));
    await db.update(schema.businessCategories).set({ imageUrl: null, imageCredit: null }).where(eq(schema.businessCategories.slug, slug));
  }
  let done = 0;
  let skipped = 0;
  let missed = 0;

  if (!only || only === "articles") {
    for (const [slug, spec] of Object.entries(ARTICLE_IMAGES)) {
      const row = await db.query.articles.findFirst({ where: and(eq(schema.articles.slug, slug), isNull(schema.articles.featuredImageUrl)), columns: { id: true, title: true } });
      if (!row) { skipped++; continue; }
      try {
        const img = await findAndImport(spec.q, "article", spec.alt, { pick: spec.pick, fallbackQuery: spec.fallback });
        if (!img) { console.log(`  · no result: ${slug} (${spec.q})`); missed++; continue; }
        await db.update(schema.articles).set({ featuredImageUrl: img.url, featuredImageAlt: spec.alt, featuredImageCredit: img.credit, featuredImageSourceUrl: img.sourceUrl }).where(eq(schema.articles.id, row.id));
        console.log(`  ✓ article ${slug} ← ${img.credit}`);
        done++;
      } catch (e) {
        console.log(`  ✗ ${slug}: ${(e as Error).message}`);
        missed++;
      }
      await sleep(PACE_MS);
    }
  }

  if (!only || only === "cities") {
    for (const [slug, spec] of Object.entries(CITY_IMAGES)) {
      const row = await db.query.locations.findFirst({ where: and(eq(schema.locations.kind, "city"), eq(schema.locations.slug, slug), isNull(schema.locations.imageUrl)), columns: { id: true } });
      if (!row) { skipped++; continue; }
      try {
        const img = await findAndImport(spec.q, "cover", spec.alt, { pick: spec.pick, fallbackQuery: spec.fallback });
        if (!img) { console.log(`  · no result: ${slug} (${spec.q})`); missed++; continue; }
        await db.update(schema.locations).set({ imageUrl: img.url, imageCredit: img.credit }).where(eq(schema.locations.id, row.id));
        console.log(`  ✓ city ${slug} ← ${img.credit}`);
        done++;
      } catch (e) {
        console.log(`  ✗ ${slug}: ${(e as Error).message}`);
        missed++;
      }
      await sleep(PACE_MS);
    }
  }

  if (!only || only === "categories") {
    for (const [slug, spec] of Object.entries(CATEGORY_IMAGES)) {
      const row = await db.query.businessCategories.findFirst({ where: and(eq(schema.businessCategories.slug, slug), isNull(schema.businessCategories.imageUrl)), columns: { id: true } });
      if (!row) { skipped++; continue; }
      try {
        const img = await findAndImport(spec.q, "photo", spec.alt, { pick: spec.pick, fallbackQuery: spec.fallback });
        if (!img) { console.log(`  · no result: ${slug} (${spec.q})`); missed++; continue; }
        await db.update(schema.businessCategories).set({ imageUrl: img.url, imageCredit: img.credit }).where(eq(schema.businessCategories.id, row.id));
        console.log(`  ✓ category ${slug} ← ${img.credit}`);
        done++;
      } catch (e) {
        console.log(`  ✗ ${slug}: ${(e as Error).message}`);
        missed++;
      }
      await sleep(PACE_MS);
    }
  }

  console.log(`✓ images: ${done} imported, ${skipped} already had one, ${missed} missed`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
