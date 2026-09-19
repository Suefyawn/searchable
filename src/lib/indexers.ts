import { desc, eq, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { plainText } from "./markdown";
import { removeSearchDocument, syncSearchDocument } from "./search";
import { TOOLS, toolUrl } from "@/tools/registry";
import { TOOL_CATEGORIES } from "@/tools/types";
import { DISCOS } from "@/content/discos";
import { indexProfessional } from "./professionals";
import { indexPost } from "./community";

/** Article → search document (or removal when unpublished). */
export async function indexArticle(articleId: string) {
  const db = await getDb();
  const a = await db.query.articles.findFirst({ where: eq(schema.articles.id, articleId), with: { category: true, location: true } });
  if (!a) return;
  const type = a.kind === "news" ? "news" : "guide";
  if (a.status !== "published" || a.noindex) {
    await removeSearchDocument(type, a.id);
    return;
  }
  await syncSearchDocument({
    entityType: type,
    entityId: a.id,
    url: `/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}`,
    title: a.title,
    summary: a.dek ?? a.excerpt ?? plainText(a.body, 200),
    body: plainText(a.body, 20_000),
    keywords: a.faqs.map((f) => f.question).join(" "),
    category: a.category?.name ?? null,
    categorySlug: a.category?.slug ?? null,
    city: a.location?.name ?? null,
    citySlug: a.location?.slug ?? null,
    imageUrl: a.featuredImageUrl,
    popularity: a.viewCount,
    publishedAt: a.publishedAt,
  });
}

export async function indexBusiness(businessId: string) {
  const db = await getDb();
  const b = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, businessId), with: { primaryCategory: true, city: true, area: true, services: true } });
  if (!b) return;
  if (b.status !== "active") {
    await removeSearchDocument("business", b.id);
    return;
  }
  await syncSearchDocument({
    entityType: "business",
    entityId: b.id,
    url: `/b/${b.slug}`,
    title: b.name,
    summary: [b.tagline, b.primaryCategory?.name, [b.area?.name, b.city?.name].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    body: [b.description, b.address, b.services.map((s) => s.name).join(", ")].filter(Boolean).join("\n"),
    keywords: [b.primaryCategory?.namePlural, b.area?.name, "near me"].filter(Boolean).join(" "),
    category: b.primaryCategory?.name ?? null,
    categorySlug: b.primaryCategory?.slug ?? null,
    city: b.city?.name ?? null,
    citySlug: b.city?.slug ?? null,
    imageUrl: b.logoUrl ?? b.coverUrl,
    popularity: b.viewCount + b.ratingCount * 5 + (b.isVerified ? 50 : 0),
    meta: { verified: b.isVerified, rating: b.ratingAvg, ratingCount: b.ratingCount, phone: b.phone, whatsapp: b.whatsapp },
  });
}

export async function indexLocation(locationId: string) {
  const db = await getDb();
  const l = await db.query.locations.findFirst({ where: eq(schema.locations.id, locationId), with: { parent: true } });
  if (!l || l.kind === "country") return;
  const url = l.kind === "city" ? `/cities/${l.slug}` : l.kind === "area" && l.parent ? `/cities/${l.parent.slug}/${l.slug}` : `/cities`;
  await syncSearchDocument({
    entityType: "location",
    entityId: l.id,
    url,
    title: l.kind === "area" && l.parent ? `${l.name}, ${l.parent.name}` : l.name,
    summary: l.description ?? (l.kind === "city" ? `Businesses, news and local information for ${l.name}` : `${l.name} area guide`),
    keywords: [l.nameUrdu, l.kind].filter(Boolean).join(" "),
    city: l.kind === "city" ? l.name : l.parent?.name ?? null,
    citySlug: l.kind === "city" ? l.slug : l.parent?.slug ?? null,
    popularity: Math.min(1000, Math.round((l.population ?? 0) / 20_000)),
  });
}

export async function indexEntity(entityId: string) {
  const db = await getDb();
  const e = await db.query.entities.findFirst({ where: eq(schema.entities.id, entityId) });
  if (!e) return;
  await syncSearchDocument({
    entityType: "entity",
    entityId: e.id,
    url: `/e/${e.slug}`,
    title: e.name,
    summary: e.description,
    keywords: [...e.aliases, e.nameUrdu, e.kind].filter(Boolean).join(" "),
    category: e.kind,
    imageUrl: e.logoUrl,
  });
}

export async function indexDataSeries(seriesId: string) {
  const db = await getDb();
  const s = await db.query.dataSeries.findFirst({ where: eq(schema.dataSeries.id, seriesId) });
  if (!s) return;
  const latest = await db.query.dataPoints.findFirst({ where: eq(schema.dataPoints.seriesId, seriesId), orderBy: [desc(schema.dataPoints.date)], columns: { date: true, value: true } });
  await syncSearchDocument({
    entityType: "data_series",
    entityId: s.id,
    url: s.slug === "solar-panel-per-watt" ? "/data/solar-panel-price" : `/data/${s.slug}`,
    title: /today/i.test(s.name) ? s.name : `${s.name} today`,
    summary: s.description ?? `${s.name} in Pakistan, latest value, history and source (${s.sourceName ?? "official"}).`,
    keywords: [s.slug.replace(/-/g, " "), "today", "rate", "price", "history", ...(s.slug.startsWith("gold") ? ["gold rate today karachi", "gold rate today lahore", "gold rate today islamabad", "1 tola gold price", "sona"] : []), ...(s.slug === "cpi-yoy" ? ["inflation rate in pakistan", "cpi", "mehngai"] : [])].join(", "),
    category: "Data",
    categorySlug: "data",
    meta: { slug: s.slug, unit: s.unit, source: s.sourceName, latest: latest ? { date: latest.date, value: Number(latest.value) } : null },
  });
}

/** Static high-intent pages (DISCO bill-check, PTA hub) live in code but must be searchable. */
export async function indexStaticPages() {
  await syncSearchDocument({
    entityType: "guide",
    entityId: "hub:pta",
    url: "/pta",
    title: "PTA tax check, IMEI check and DIRBS registration",
    summary: "Check PTA approval by IMEI (SMS 8484), see the PTA tax list for passport and CNIC, and register a phone on DIRBS step by step.",
    keywords: "pta, pta tax, pta tax check, pta imei check, pta check, pta approved check, dirbs, pta mobile registration, pta tax list, pta registration, iphone pta tax, mobile registration pakistan",
    category: "Telecom",
    categorySlug: "telecom",
    boost: 1.4,
  });
  await syncSearchDocument({
    entityType: "guide",
    entityId: "hub:net-metering",
    url: "/electricity/net-metering",
    title: "Net metering in Pakistan 2026: new NEPRA rules, approved inverters, how to apply",
    summary: "Net billing export rate, eligibility, step-by-step application with legal time limits, costs, the approved inverter list and DISCO-by-DISCO details for LESCO, IESCO, MEPCO, K-Electric and the rest.",
    keywords: "net metering, net metering in pakistan, net metering pakistan 2026, net billing, nepra prosumer regulations, net metering approved inverters, approved inverter list, lesco net metering, iesco net metering, mepco net metering, k electric net metering, net metering cost, net metering procedure, green meter, bi-directional meter, solar export rate",
    category: "Electricity",
    categorySlug: "utilities",
    boost: 1.4,
  });
  await syncSearchDocument({
    entityType: "guide",
    entityId: "hub:cars",
    url: "/compare/cars",
    title: "Car prices in Pakistan: compare every new car",
    summary: "Ex-factory prices, engine, gearbox, fuel economy and airbags for Suzuki, Toyota, Honda, Hyundai, Kia, Changan, MG, Haval and BYD, with filters by body, fuel and budget.",
    keywords: "car price in pakistan, car prices in pakistan, alto price in pakistan, alto car price, swift price in pakistan, wagon r price, suzuki every price, corolla price, city price, civic price, sportage price, tucson price, byd price pakistan, new cars pakistan, cheapest car in pakistan, electric car price pakistan",
    category: "Cars",
    categorySlug: "cars",
    boost: 1.4,
  });
  await syncSearchDocument({
    entityType: "guide",
    entityId: "hub:solar-inverters",
    url: "/compare/solar-inverters",
    title: "Solar inverter price in Pakistan: compare hybrid, on-grid and off-grid",
    summary: "Dealer prices and specs for Inverex, Ziewnic, Solis, Deye, Growatt, Sungrow and Huawei inverters from 3 kW to 12 kW, plus lithium battery prices.",
    keywords: "inverter price in pakistan, solar inverter price in pakistan, solar inverter, hybrid inverter price in pakistan, 5kw solar inverter price, 10kw inverter price, inverex inverter price, ziewnic inverter, best solar inverter in pakistan, off grid inverter, solar battery price, lithium battery price",
    category: "Solar",
    categorySlug: "solar",
    boost: 1.3,
  });
  for (const d of DISCOS) {
    await syncSearchDocument({
      entityType: "guide",
      entityId: `disco:${d.slug}`,
      url: `/electricity/${d.slug}`,
      title: `${d.short} bill check online`,
      summary: `Check your ${d.short} electricity bill by reference number, see the per-unit price and calculate a bill. ${d.cities.slice(0, 4).join(", ")}.`,
      keywords: [`${d.short.toLowerCase()} bill`, `${d.short.toLowerCase()} bill check`, `${d.short.toLowerCase()} online bill`, `${d.short.toLowerCase()} duplicate bill`, "electricity bill check online", "bijli bill", d.name, ...(d.aliases ?? []).map((a) => `${a.toLowerCase()} bill`), ...d.cities].join(", "),
      category: "Electricity",
      categorySlug: "utilities",
      boost: 1.3,
    });
  }
}

/** Mirror the code registry into the `tools` table and the search index. */
export async function indexTools() {
  const db = await getDb();
  for (const t of TOOLS) {
    const [row] = await db
      .insert(schema.tools)
      .values({
        slug: t.slug,
        category: t.category,
        name: t.name,
        shortName: t.shortName,
        description: t.description,
        keywords: t.keywords,
        version: t.version,
        lastReviewedAt: new Date(t.lastReviewed),
        isFeatured: !!t.featured,
      })
      .onConflictDoUpdate({
        target: schema.tools.slug,
        set: { category: t.category, name: t.name, shortName: t.shortName, description: t.description, keywords: t.keywords, version: t.version, lastReviewedAt: new Date(t.lastReviewed), isFeatured: !!t.featured, isActive: true },
      })
      .returning({ id: schema.tools.id, runCount: schema.tools.runCount });
    await syncSearchDocument({
      entityType: "tool",
      entityId: row.id,
      url: toolUrl(t),
      title: t.name,
      summary: t.description,
      body: [t.methodology, t.faqs.map((f) => `${f.question} ${f.answer}`).join("\n")].join("\n"),
      keywords: t.keywords.join(", "),
      category: TOOL_CATEGORIES[t.category].name,
      categorySlug: t.category,
      popularity: row.runCount,
      meta: { slug: t.slug },
    });
  }
}

/** Runs `fn` over `items`, `width` at a time: D1 round trips dominate a reindex, so eight in flight is eight times faster. */
async function inBatches<T>(items: T[], width: number, fn: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += width) await Promise.all(items.slice(i, i + width).map(fn));
}

/**
 * Rebuilds every search document in place: upserts first (search keeps answering throughout, no empty window),
 * then deletes whatever the pass did not touch, which is how a deleted or unpublished item leaves the index.
 * About 700 documents in under a minute on production; the old one-at-a-time delete-then-rebuild took six.
 */
export async function reindexAll() {
  const db = await getDb();
  const startedAt = new Date();
  const [articles, businesses, locations, entities, series, pros, postRows] = await Promise.all([
    db.select({ id: schema.articles.id }).from(schema.articles),
    db.select({ id: schema.businesses.id }).from(schema.businesses),
    db.select({ id: schema.locations.id }).from(schema.locations),
    db.select({ id: schema.entities.id }).from(schema.entities),
    db.select({ id: schema.dataSeries.id }).from(schema.dataSeries),
    db.select({ id: schema.professionals.id }).from(schema.professionals),
    db.select({ id: schema.posts.id }).from(schema.posts),
  ]);
  const WIDTH = 8;
  await inBatches(articles, WIDTH, (a) => indexArticle(a.id));
  await inBatches(businesses, WIDTH, (b) => indexBusiness(b.id));
  await inBatches(locations, WIDTH, (l) => indexLocation(l.id));
  await inBatches(entities, WIDTH, (e) => indexEntity(e.id));
  await inBatches(series, WIDTH, (d) => indexDataSeries(d.id));
  await inBatches(pros, WIDTH, (p) => indexProfessional(p.id));
  await inBatches(postRows, WIDTH, (p) => indexPost(p.id));
  await indexTools();
  await indexStaticPages();
  const stale = await db.delete(schema.searchDocuments).where(lt(schema.searchDocuments.updatedAt, startedAt)).returning({ id: schema.searchDocuments.id });
  return { articles: articles.length, businesses: businesses.length, locations: locations.length, entities: entities.length, series: series.length, professionals: pros.length, tools: TOOLS.length, removed: stale.length };
}
