import type { MetadataRoute } from "next";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { SITE } from "@/lib/utils";
import { TOOLS, toolUrl } from "@/tools/registry";
import { TOOL_CATEGORIES } from "@/tools/types";
import { DISCOS } from "@/content/discos";
import { PROFESSIONS } from "@/content/professions";
import { POST_KINDS } from "@/lib/community-schema";
import { brandSlug, PRICE_CATEGORIES, PRICE_INDEX_MIN, readPriceSet } from "@/lib/prices-data";
import { POSTAL_GROUPS } from "@/lib/postal-codes";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const [articles, businesses, cities, entities, categories, bcats, series, pros, communityPosts, categoryCities] = await Promise.all([
    db
      .select({ kind: schema.articles.kind, slug: schema.articles.slug, updatedAt: schema.articles.updatedAt, cat: schema.categories.slug })
      .from(schema.articles)
      .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
      .where(and(eq(schema.articles.status, "published"), eq(schema.articles.noindex, false))),
    db.select({ slug: schema.businesses.slug, updatedAt: schema.businesses.updatedAt }).from(schema.businesses).where(eq(schema.businesses.status, "active")),
    db.select({ slug: schema.locations.slug, updatedAt: schema.locations.updatedAt, lat: schema.locations.lat }).from(schema.locations).where(eq(schema.locations.kind, "city")),
    db.select({ slug: schema.entities.slug, updatedAt: schema.entities.updatedAt }).from(schema.entities),
    db.select({ kind: schema.categories.kind, slug: schema.categories.slug }).from(schema.categories),
    db.select({ slug: schema.businessCategories.slug }).from(schema.businessCategories),
    db.select({ slug: schema.dataSeries.slug, updatedAt: schema.dataSeries.updatedAt }).from(schema.dataSeries),
    db.select({ slug: schema.professionals.slug, updatedAt: schema.professionals.updatedAt }).from(schema.professionals).where(eq(schema.professionals.status, "active")),
    db.select({ slug: schema.posts.slug, updatedAt: schema.posts.updatedAt }).from(schema.posts).where(eq(schema.posts.status, "published")),
    // Category × city pages, the directory's main landing type; the same five-listing gate as their noindex rule.
    db
      .select({ city: schema.locations.slug, cat: schema.businessCategories.slug, updatedAt: sql<string>`max(${schema.businesses.updatedAt})` })
      .from(schema.businesses)
      .innerJoin(schema.locations, eq(schema.businesses.cityId, schema.locations.id))
      .innerJoin(schema.businessCategories, eq(schema.businesses.primaryCategoryId, schema.businessCategories.id))
      .where(eq(schema.businesses.status, "active"))
      .groupBy(schema.locations.slug, schema.businessCategories.slug)
      .having(sql`count(*) >= 5`),
  ]);
  const priceSets = await Promise.all(PRICE_CATEGORIES.map(async (category) => ({ category, set: await readPriceSet(category) })));
  const u = (path: string, lastModified?: Date, priority = 0.6, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly") => ({ url: `${SITE.url}${path}`, lastModified, priority, changeFrequency });
  return [
    u("/", undefined, 1, "daily"),
    u("/news", undefined, 0.9, "daily"),
    u("/guides", undefined, 0.9, "weekly"),
    u("/tools", undefined, 0.9, "weekly"),
    u("/businesses", undefined, 0.8, "weekly"),
    u("/professionals", undefined, 0.8, "weekly"),
    u("/community/all", undefined, 0.7, "daily"),
    ...POST_KINDS.map((k) => u(`/community/${k.key}`, undefined, 0.6, "daily")),
    ...PROFESSIONS.map((p) => u(`/professionals/${p.slug}`, undefined, 0.6)),
    u("/cities", undefined, 0.7, "monthly"),
    u("/data", undefined, 0.8, "daily"),
    u("/today", undefined, 0.8, "daily"),
    u("/earthquake-today", undefined, 0.8, "hourly"),
    u("/cricket-today", undefined, 0.9, "hourly"),
    u("/postal-codes", undefined, 0.8, "monthly"),
    ...POSTAL_GROUPS.map((g) => u(`/postal-codes/${g.slug}`, undefined, 0.7, "monthly")),
    u("/ramadan-calendar", undefined, 0.8, "weekly"),
    ...cities.filter((c) => c.lat !== null).map((c) => u(`/ramadan-calendar/${c.slug}`, undefined, 0.7, "weekly")),
    u("/prices", undefined, 0.8, "daily"),
    ...priceSets.flatMap(({ category, set }) => (set.items.length >= PRICE_INDEX_MIN ? [u(`/prices/${category}`, new Date(set.updatedAt ?? Date.now()), 0.9, "daily"), ...[...new Set(set.items.map((i) => brandSlug(i.brand)))].map((b) => u(`/prices/${category}/${b}`, undefined, 0.7, "weekly")), ...set.items.map((i) => u(`/prices/${category}/${i.slug}`, new Date(i.updatedAt ?? Date.now()), 0.8, "weekly"))] : [])),
    u("/islamic-date", undefined, 0.9, "daily"),
    u("/prayer-times", undefined, 0.8, "daily"),
    u("/weather", undefined, 0.8, "hourly"),
    ...cities.filter((c) => c.lat !== null).map((c) => u(`/prayer-times/${c.slug}`, undefined, 0.8, "daily")),
    ...cities.filter((c) => c.lat !== null).map((c) => u(`/weather/${c.slug}`, undefined, 0.8, "hourly")),
    u("/electricity", undefined, 0.8, "monthly"),
    u("/pta", undefined, 0.9, "weekly"),
    u("/data/solar-panel-price", undefined, 0.9, "weekly"),
    u("/compare/solar-inverters", undefined, 0.8, "monthly"),
    u("/compare/cars", undefined, 0.9, "monthly"),
    u("/compare", undefined, 0.7, "monthly"),
    u("/electricity/net-metering", undefined, 0.9, "monthly"),
    ...DISCOS.map((d) => u(`/electricity/${d.slug}`, undefined, 0.8, "monthly")),
    u("/newsletter", undefined, 0.5, "monthly"),
    u("/advertise", undefined, 0.6, "monthly"),
    u("/write-for-us", undefined, 0.6, "monthly"),
    ...series.filter((d) => d.slug !== "solar-panel-per-watt").map((d) => u(`/data/${d.slug}`, d.updatedAt, 0.8, "daily")),
    ...categories.map((c) => u(`/${c.kind === "news" ? "news" : "guides"}/${c.slug}`, undefined, 0.7, "daily")),
    ...Object.keys(TOOL_CATEGORIES).map((c) => u(`/tools/${c}`, undefined, 0.7)),
    ...TOOLS.map((t) => u(toolUrl(t), new Date(t.lastReviewed), 0.9, "monthly")),
    ...articles.map((a) => u(`/${a.kind === "news" ? "news" : "guides"}/${a.cat ?? "general"}/${a.slug}`, a.updatedAt, a.kind === "guide" ? 0.8 : 0.7)),
    ...bcats.map((c) => u(`/businesses/${c.slug}`, undefined, 0.6)),
    ...categoryCities.map((r) => u(`/businesses/${r.cat}/${r.city}`, new Date(r.updatedAt), 0.7)),
    ...businesses.map((b) => u(`/b/${b.slug}`, b.updatedAt, 0.5)),
    ...pros.map((p) => u(`/p/${p.slug}`, p.updatedAt, 0.5)),
    ...communityPosts.map((p) => u(`/community/post/${p.slug}`, p.updatedAt, 0.4)),
    ...cities.map((c) => u(`/cities/${c.slug}`, c.updatedAt, 0.6)),
    ...entities.map((e) => u(`/e/${e.slug}`, e.updatedAt, 0.5)),
  ];
}
