import { eq, sql } from "drizzle-orm";
import { getDb, rawQuery, schema } from "@/db";
import { BUSINESSES } from "@/db/seed-data/businesses";
import { GUIDES, type ArticleDef } from "@/db/seed-data/guides";
import { NEWS } from "@/db/seed-data/news";
import { BUSINESS_CATEGORIES, CITIES, DATA_SERIES, ENTITIES, GUIDE_CATEGORIES, NEWS_CATEGORIES, PROVINCES, SYNONYMS } from "@/db/seed-data/reference";
import { getAuth } from "@/lib/auth";
import { readingMinutes } from "@/lib/format";
import { reindexAll } from "@/lib/indexers";
import { plainText } from "@/lib/markdown";

/*
 * Seeding runs inside the app (POST /api/admin/jobs { job: "seed", mode, adminEmail, adminPassword }), because
 * only the Worker holds the D1 binding. `reference`: locations, categories, entities, synonyms, data series,
 * tools, the admin user. `sample`: all of that plus sample articles and businesses (local development only).
 * Production data comes from scripts/export-for-d1.ts instead. The output lines are collected and returned.
 */
export type SeedOptions = { mode: "reference" | "sample"; adminEmail?: string; adminPassword?: string };
const log: string[] = [];
const console = { log: (line: string) => log.push(line) };

async function seedAdmin(opts: SeedOptions) {
  const email = opts.adminEmail ?? "admin@searchable.pk";
  const password = opts.adminPassword;
  const db = await getDb();
  if (!password) {
    const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    if (existing) return existing.id;
    throw new Error("Give adminPassword: no admin account exists yet.");
  }
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) {
    if (existing.role !== "admin") await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, existing.id));
    return existing.id;
  }
  const auth = await getAuth();
  const res = await auth.api.signUpEmail({ body: { email, password, name: "Searchable Admin" } });
  await db.update(schema.users).set({ role: "admin", emailVerified: true }).where(eq(schema.users.id, res.user.id));
  console.log(`  admin: ${email} / ${password}`);
  return res.user.id;
}

async function seedLocations() {
  const db = await getDb();
  const [pk] = await db
    .insert(schema.locations)
    .values({ kind: "country", slug: "pakistan", name: "Pakistan", nameUrdu: "پاکستان", lat: 30.3753, lng: 69.3451, population: 241_000_000 })
    .onConflictDoUpdate({ target: [schema.locations.kind, schema.locations.slug], set: { name: "Pakistan" } })
    .returning();

  const provinceIds = new Map<string, string>();
  for (const p of PROVINCES) {
    const [row] = await db
      .insert(schema.locations)
      .values({ kind: "province", slug: p.slug, name: p.name, nameUrdu: p.nameUrdu, parentId: pk.id, sortOrder: p.sortOrder })
      .onConflictDoUpdate({ target: [schema.locations.kind, schema.locations.slug], set: { name: p.name, parentId: pk.id, sortOrder: p.sortOrder } })
      .returning();
    provinceIds.set(p.slug, row.id);
  }

  const cityIds = new Map<string, string>();
  const areaIds = new Map<string, string>();
  for (const c of CITIES) {
    const provinceId = provinceIds.get(c.province)!;
    const [row] = await db
      .insert(schema.locations)
      .values({ kind: "city", slug: c.slug, name: c.name, nameUrdu: c.nameUrdu, parentId: provinceId, provinceId, lat: c.lat, lng: c.lng, population: c.population })
      .onConflictDoUpdate({ target: [schema.locations.kind, schema.locations.slug], set: { name: c.name, parentId: provinceId, provinceId, lat: c.lat, lng: c.lng, population: c.population } })
      .returning();
    await db.update(schema.locations).set({ cityId: row.id }).where(eq(schema.locations.id, row.id));
    cityIds.set(c.slug, row.id);
    for (const [i, a] of (c.areas ?? []).entries()) {
      const [ar] = await db
        .insert(schema.locations)
        .values({ kind: "area", slug: a.slug, name: a.name, parentId: row.id, cityId: row.id, provinceId, sortOrder: i })
        .onConflictDoUpdate({ target: [schema.locations.kind, schema.locations.slug], set: { name: a.name, parentId: row.id, cityId: row.id, provinceId, sortOrder: i } })
        .returning();
      areaIds.set(a.slug, ar.id);
    }
  }
  console.log(`  locations: ${PROVINCES.length} provinces, ${CITIES.length} cities, ${areaIds.size} areas`);
  return { cityIds, areaIds };
}

async function seedCategories() {
  const db = await getDb();
  const ids = new Map<string, string>();
  const insert = async (kind: "news" | "guide", list: readonly (readonly [string, string, string])[]) => {
    for (const [i, [slug, name, description]] of list.entries()) {
      const [row] = await db
        .insert(schema.categories)
        .values({ kind, slug, name, description, sortOrder: i })
        .onConflictDoUpdate({ target: [schema.categories.kind, schema.categories.slug], set: { name, description, sortOrder: i } })
        .returning();
      ids.set(`${kind}:${slug}`, row.id);
    }
  };
  await insert("news", NEWS_CATEGORIES);
  await insert("guide", GUIDE_CATEGORIES);

  const bcIds = new Map<string, string>();
  for (const [i, [slug, name, namePlural, icon]] of BUSINESS_CATEGORIES.entries()) {
    const [row] = await db
      .insert(schema.businessCategories)
      .values({ slug, name, namePlural, icon, sortOrder: i })
      .onConflictDoUpdate({ target: schema.businessCategories.slug, set: { name, namePlural, icon, sortOrder: i } })
      .returning();
    bcIds.set(slug, row.id);
  }
  console.log(`  categories: ${NEWS_CATEGORIES.length} news, ${GUIDE_CATEGORIES.length} guide, ${BUSINESS_CATEGORIES.length} business`);
  return { ids, bcIds };
}

async function seedEntities() {
  const db = await getDb();
  const ids = new Map<string, string>();
  for (const e of ENTITIES) {
    const [row] = await db
      .insert(schema.entities)
      .values({ kind: e.kind, slug: e.slug, name: e.name, nameUrdu: e.nameUrdu, aliases: e.aliases ?? [], description: e.description, website: e.website, facts: e.facts ?? {} })
      .onConflictDoUpdate({ target: schema.entities.slug, set: { kind: e.kind, name: e.name, nameUrdu: e.nameUrdu, aliases: e.aliases ?? [], description: e.description, website: e.website, facts: e.facts ?? {} } })
      .returning();
    ids.set(e.slug, row.id);
  }
  for (const [term, synonyms] of SYNONYMS) {
    await db.insert(schema.searchSynonyms).values({ term, synonyms }).onConflictDoUpdate({ target: schema.searchSynonyms.term, set: { synonyms } });
  }
  console.log(`  entities: ${ENTITIES.length}, synonyms: ${SYNONYMS.length}`);
  return ids;
}

async function seedDataSeries() {
  const db = await getDb();
  for (const s of DATA_SERIES) {
    const [row] = await db
      .insert(schema.dataSeries)
      .values({ slug: s.slug, name: s.name, unit: s.unit, frequency: s.frequency, sourceName: s.sourceName, sourceUrl: s.sourceUrl, description: s.description })
      .onConflictDoUpdate({ target: schema.dataSeries.slug, set: { name: s.name, unit: s.unit, frequency: s.frequency, sourceName: s.sourceName, sourceUrl: s.sourceUrl, description: s.description } })
      .returning();
    for (const [date, value] of s.points) {
      await db.insert(schema.dataPoints).values({ seriesId: row.id, date: date as string, value: value as number }).onConflictDoUpdate({ target: [schema.dataPoints.seriesId, schema.dataPoints.date], set: { value: value as number } });
    }
  }
  console.log(`  data series: ${DATA_SERIES.length}`);
}

async function linkEntities(entityIds: Map<string, string>, targetType: "article" | "business" | "tool", targetId: string, slugs: string[] = []) {
  const db = await getDb();
  for (const slug of slugs) {
    const entityId = entityIds.get(slug);
    if (!entityId) continue;
    await db.insert(schema.entityLinks).values({ entityId, targetType, targetId, relation: "about" }).onConflictDoNothing();
  }
}

async function seedArticles(kind: "news" | "guide", list: ArticleDef[], catIds: Map<string, string>, cityIds: Map<string, string>, entityIds: Map<string, string>, authorId: string) {
  const db = await getDb();
  for (const a of list) {
    const publishedAt = new Date(Date.now() - (a.publishedDaysAgo ?? 3) * 86_400_000);
    const [row] = await db
      .insert(schema.articles)
      .values({
        kind,
        status: "published",
        slug: a.slug,
        title: a.title,
        dek: a.dek,
        body: a.body,
        excerpt: plainText(a.body, 180),
        categoryId: catIds.get(`${kind}:${a.category}`),
        authorId,
        locationId: a.city ? cityIds.get(a.city) : undefined,
        sources: a.sources ?? [],
        faqs: a.faqs ?? [],
        isFeatured: !!a.featured,
        readingMinutes: readingMinutes(a.body),
        publishedAt,
        lastReviewedAt: publishedAt,
        viewCount: Math.floor(Math.random() * 400),
      })
      .onConflictDoUpdate({
        target: [schema.articles.kind, schema.articles.slug],
        set: { title: a.title, dek: a.dek, body: a.body, excerpt: plainText(a.body, 180), sources: a.sources ?? [], faqs: a.faqs ?? [], isFeatured: !!a.featured, readingMinutes: readingMinutes(a.body) },
      })
      .returning();
    await linkEntities(entityIds, "article", row.id, a.entities);
  }
  console.log(`  ${kind}: ${list.length}`);
}

async function seedBusinesses(bcIds: Map<string, string>, cityIds: Map<string, string>, areaIds: Map<string, string>, entityIds: Map<string, string>) {
  const db = await getDb();
  for (const b of BUSINESSES) {
    const city = CITIES.find((c) => c.slug === b.city);
    const [row] = await db
      .insert(schema.businesses)
      .values({
        slug: b.slug,
        name: b.name,
        status: "active",
        tier: b.tier ?? "free",
        tagline: b.tagline,
        description: b.description,
        primaryCategoryId: bcIds.get(b.category),
        cityId: cityIds.get(b.city),
        areaId: b.area ? areaIds.get(b.area) : undefined,
        address: b.address,
        lat: city ? city.lat + (Math.random() - 0.5) * 0.08 : undefined,
        lng: city ? city.lng + (Math.random() - 0.5) * 0.08 : undefined,
        phone: b.phone,
        whatsapp: b.whatsapp,
        website: b.website,
        priceRange: b.priceRange,
        ratingAvg: b.rating?.[0] ?? 0,
        ratingCount: b.rating?.[1] ?? 0,
        isVerified: !!b.verified,
        verifiedAt: b.verified ? new Date() : undefined,
        lastVerifiedAt: b.verified ? new Date() : undefined,
        viewCount: Math.floor(Math.random() * 2000),
      })
      .onConflictDoUpdate({ target: schema.businesses.slug, set: { name: b.name, description: b.description, tagline: b.tagline, address: b.address, phone: b.phone, whatsapp: b.whatsapp, website: b.website, tier: b.tier ?? "free", isVerified: !!b.verified } })
      .returning();

    await db.delete(schema.businessHours).where(eq(schema.businessHours.businessId, row.id));
    if (b.hours) {
      for (let d = 0; d < 7; d++) {
        await db.insert(schema.businessHours).values(b.hours === "24h" ? { businessId: row.id, dayOfWeek: d, opens: "00:00", closes: "23:59" } : { businessId: row.id, dayOfWeek: d, opens: b.hours[0], closes: b.hours[1] });
      }
    }
    await db.delete(schema.businessServices).where(eq(schema.businessServices.businessId, row.id));
    for (const [i, s] of (b.services ?? []).entries()) {
      await db.insert(schema.businessServices).values({ businessId: row.id, name: s, sortOrder: i });
    }
    await db.insert(schema.businessCategoryLinks).values({ businessId: row.id, categoryId: bcIds.get(b.category)! }).onConflictDoNothing();
    await linkEntities(entityIds, "business", row.id, b.entities);
  }
  console.log(`  businesses: ${BUSINESSES.length}`);
}

async function linkToolsToEntities(entityIds: Map<string, string>) {
  const db = await getDb();
  const { TOOLS } = await import("@/tools/registry");
  for (const t of TOOLS) {
    const row = await db.query.tools.findFirst({ where: eq(schema.tools.slug, t.slug) });
    if (row) await linkEntities(entityIds, "tool", row.id, t.related?.entities);
  }
}

export async function runSeed(opts: SeedOptions): Promise<string[]> {
  log.length = 0;
  const MODE = opts.mode;
  console.log(`Seeding (${MODE})`);
  const db = await getDb();
  const adminId = await seedAdmin(opts);
  const { cityIds, areaIds } = await seedLocations();
  const { ids: catIds, bcIds } = await seedCategories();
  const entityIds = await seedEntities();
  await seedDataSeries();

  if (MODE === "sample") {
    const [author] = await db
      .insert(schema.authors)
      .values({ slug: "searchable-editorial", name: "Searchable Editorial", bio: "Research and explainers by the Searchable team.", userId: adminId })
      .onConflictDoUpdate({ target: schema.authors.slug, set: { name: "Searchable Editorial" } })
      .returning();
    await seedArticles("guide", GUIDES, catIds, cityIds, entityIds, author.id);
    await seedArticles("news", NEWS, catIds, cityIds, entityIds, author.id);
    await seedBusinesses(bcIds, cityIds, areaIds, entityIds);
    // Remember which rows are demonstration content so /admin/system can remove them in one go.
    const sample = { articles: [...GUIDES, ...NEWS].map((a) => a.slug), businesses: BUSINESSES.map((b) => b.slug), seededAt: new Date().toISOString() };
    await db.insert(schema.settings).values({ key: "seed:sample", value: sample }).onConflictDoUpdate({ target: schema.settings.key, set: { value: sample, updatedAt: new Date() } });
    // A few sample searches so "popular searches" has something to show.
    for (const q of ["income tax", "pta tax iphone", "solar companies lahore", "electricity bill", "dollar rate", "zakat", "restaurants lahore", "become a filer"]) {
      await db.insert(schema.searchQueries).values({ query: q, normalized: q, resultCount: 3 });
    }
  }

  const counts = await reindexAll();
  await linkToolsToEntities(entityIds);
  console.log(`  search index: ${JSON.stringify(counts)}`);
  const [{ n }] = await rawQuery<{ n: number }>(db, sql`select count(*) as n from search_documents`);
  console.log(`seed complete, ${n} search documents`);
  return log;
}

