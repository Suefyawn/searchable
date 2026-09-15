import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { SITE } from "@/lib/utils";
import { TOOLS, toolUrl } from "@/tools/registry";
import { TOOL_CATEGORIES } from "@/tools/types";
import { DISCOS } from "@/content/discos";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const [articles, businesses, cities, entities, categories, bcats, series] = await Promise.all([
    db
      .select({ kind: schema.articles.kind, slug: schema.articles.slug, updatedAt: schema.articles.updatedAt, cat: schema.categories.slug })
      .from(schema.articles)
      .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
      .where(and(eq(schema.articles.status, "published"), eq(schema.articles.noindex, false))),
    db.select({ slug: schema.businesses.slug, updatedAt: schema.businesses.updatedAt }).from(schema.businesses).where(eq(schema.businesses.status, "active")),
    db.select({ slug: schema.locations.slug, updatedAt: schema.locations.updatedAt }).from(schema.locations).where(eq(schema.locations.kind, "city")),
    db.select({ slug: schema.entities.slug, updatedAt: schema.entities.updatedAt }).from(schema.entities),
    db.select({ kind: schema.categories.kind, slug: schema.categories.slug }).from(schema.categories),
    db.select({ slug: schema.businessCategories.slug }).from(schema.businessCategories),
    db.select({ slug: schema.dataSeries.slug, updatedAt: schema.dataSeries.updatedAt }).from(schema.dataSeries),
  ]);
  const u = (path: string, lastModified?: Date, priority = 0.6, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly") => ({ url: `${SITE.url}${path}`, lastModified, priority, changeFrequency });
  return [
    u("/", new Date(), 1, "daily"),
    u("/news", new Date(), 0.9, "daily"),
    u("/guides", new Date(), 0.9, "weekly"),
    u("/tools", new Date(), 0.9, "weekly"),
    u("/businesses", new Date(), 0.8, "weekly"),
    u("/cities", new Date(), 0.7, "monthly"),
    u("/data", new Date(), 0.8, "daily"),
    u("/electricity", undefined, 0.8, "monthly"),
    u("/pta", undefined, 0.9, "weekly"),
    u("/data/solar-panel-price", new Date(), 0.9, "weekly"),
    u("/compare/solar-inverters", new Date(), 0.8, "monthly"),
    u("/electricity/net-metering", new Date(), 0.9, "monthly"),
    ...DISCOS.map((d) => u(`/electricity/${d.slug}`, undefined, 0.8, "monthly")),
    u("/newsletter", undefined, 0.5, "monthly"),
    ...series.filter((d) => d.slug !== "solar-panel-per-watt").map((d) => u(`/data/${d.slug}`, d.updatedAt, 0.8, "daily")),
    ...categories.map((c) => u(`/${c.kind === "news" ? "news" : "guides"}/${c.slug}`, undefined, 0.7, "daily")),
    ...Object.keys(TOOL_CATEGORIES).map((c) => u(`/tools/${c}`, undefined, 0.7)),
    ...TOOLS.map((t) => u(toolUrl(t), new Date(t.lastReviewed), 0.9, "monthly")),
    ...articles.map((a) => u(`/${a.kind === "news" ? "news" : "guides"}/${a.cat ?? "general"}/${a.slug}`, a.updatedAt, a.kind === "guide" ? 0.8 : 0.7)),
    ...bcats.map((c) => u(`/businesses/${c.slug}`, undefined, 0.6)),
    ...businesses.map((b) => u(`/b/${b.slug}`, b.updatedAt, 0.5)),
    ...cities.map((c) => u(`/cities/${c.slug}`, c.updatedAt, 0.6)),
    ...entities.map((e) => u(`/e/${e.slug}`, e.updatedAt, 0.5)),
  ];
}
