import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
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
  const [articles, businesses, cities, entities, categories, bcats, series, pros, communityPosts] = await Promise.all([
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
  ]);
  const priceSets = await Promise.all(PRICE_CATEGORIES.map(async (category) => ({ category, set: await readPriceSet(category) })));
  const u = (path: string, lastModified?: Date, priority = 0.6, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly") => ({ url: `${SITE.url}${path}`, lastModified, priority, changeFrequency });
  return [
    u("/", new Date(), 1, "daily"),
    u("/news", new Date(), 0.9, "daily"),
    u("/guides", new Date(), 0.9, "weekly"),
    u("/tools", new Date(), 0.9, "weekly"),
    u("/businesses", new Date(), 0.8, "weekly"),
    u("/professionals", new Date(), 0.8, "weekly"),
    u("/community/all", new Date(), 0.7, "daily"),
    ...POST_KINDS.map((k) => u(`/community/${k.key}`, new Date(), 0.6, "daily")),
    ...PROFESSIONS.map((p) => u(`/professionals/${p.slug}`, undefined, 0.6)),
    u("/cities", new Date(), 0.7, "monthly"),
    u("/data", new Date(), 0.8, "daily"),
    u("/today", new Date(), 0.8, "daily"),
    u("/earthquake-today", new Date(), 0.8, "hourly"),
    u("/cricket-today", new Date(), 0.9, "hourly"),
    u("/postal-codes", undefined, 0.8, "monthly"),
    ...POSTAL_GROUPS.map((g) => u(`/postal-codes/${g.slug}`, undefined, 0.7, "monthly")),
    u("/ramadan-calendar", new Date(), 0.8, "weekly"),
    ...cities.filter((c) => c.lat !== null).map((c) => u(`/ramadan-calendar/${c.slug}`, new Date(), 0.7, "weekly")),
    u("/prices", new Date(), 0.8, "daily"),
    ...priceSets.flatMap(({ category, set }) => (set.items.length >= PRICE_INDEX_MIN ? [u(`/prices/${category}`, new Date(set.updatedAt ?? Date.now()), 0.9, "daily"), ...[...new Set(set.items.map((i) => brandSlug(i.brand)))].map((b) => u(`/prices/${category}/${b}`, new Date(), 0.7, "weekly")), ...set.items.map((i) => u(`/prices/${category}/${i.slug}`, new Date(i.updatedAt ?? Date.now()), 0.8, "weekly"))] : [])),
    u("/islamic-date", new Date(), 0.9, "daily"),
    u("/prayer-times", new Date(), 0.8, "daily"),
    u("/weather", new Date(), 0.8, "hourly"),
    ...cities.filter((c) => c.lat !== null).map((c) => u(`/prayer-times/${c.slug}`, new Date(), 0.8, "daily")),
    ...cities.filter((c) => c.lat !== null).map((c) => u(`/weather/${c.slug}`, new Date(), 0.8, "hourly")),
    u("/electricity", undefined, 0.8, "monthly"),
    u("/pta", undefined, 0.9, "weekly"),
    u("/data/solar-panel-price", new Date(), 0.9, "weekly"),
    u("/compare/solar-inverters", new Date(), 0.8, "monthly"),
    u("/compare/cars", new Date(), 0.9, "monthly"),
    u("/compare", undefined, 0.7, "monthly"),
    u("/electricity/net-metering", new Date(), 0.9, "monthly"),
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
    ...businesses.map((b) => u(`/b/${b.slug}`, b.updatedAt, 0.5)),
    ...pros.map((p) => u(`/p/${p.slug}`, p.updatedAt, 0.5)),
    ...communityPosts.map((p) => u(`/community/post/${p.slug}`, p.updatedAt, 0.4)),
    ...cities.map((c) => u(`/cities/${c.slug}`, c.updatedAt, 0.6)),
    ...entities.map((e) => u(`/e/${e.slug}`, e.updatedAt, 0.5)),
  ];
}
