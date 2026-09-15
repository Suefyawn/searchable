import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PROFESSIONS } from "@/content/professions";
import { withAdminApi } from "@/lib/admin-api";
import { TOOLS, toolUrl } from "@/tools/registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reference: the slugs the automation must use. Categories for news and guides, business
 * categories, cities and areas, entities, data series, professions, calculators and their URLs.
 */
export const GET = withAdminApi(async () => {
  const db = await getDb();
  const [categories, bizCats, cities, areas, entities, series, authors] = await Promise.all([
    db.query.categories.findMany({ orderBy: [asc(schema.categories.kind), asc(schema.categories.sortOrder)], columns: { kind: true, slug: true, name: true, description: true } }),
    db.query.businessCategories.findMany({ orderBy: [asc(schema.businessCategories.name)], columns: { slug: true, name: true, namePlural: true } }),
    db.query.locations.findMany({ where: eq(schema.locations.kind, "city"), orderBy: [asc(schema.locations.name)], columns: { id: true, slug: true, name: true } }),
    db.query.locations.findMany({ where: eq(schema.locations.kind, "area"), orderBy: [asc(schema.locations.name)], columns: { slug: true, name: true, cityId: true } }),
    db.query.entities.findMany({ orderBy: [asc(schema.entities.name)], columns: { slug: true, name: true, kind: true } }),
    db.query.dataSeries.findMany({ orderBy: [asc(schema.dataSeries.name)], columns: { slug: true, name: true, unit: true, frequency: true, sourceName: true } }),
    db.query.authors.findMany({ columns: { id: true, slug: true, name: true } }),
  ]);
  const cityById = new Map(cities.map((c) => [c.id, c.slug]));
  return {
    articleKinds: ["news", "guide"],
    newsCategories: categories.filter((c) => c.kind === "news").map(({ slug, name, description }) => ({ slug, name, description })),
    guideCategories: categories.filter((c) => c.kind === "guide").map(({ slug, name, description }) => ({ slug, name, description })),
    businessCategories: bizCats,
    cities: cities.map(({ slug, name }) => ({ slug, name })),
    areas: areas.map((a) => ({ slug: a.slug, name: a.name, city: a.cityId ? cityById.get(a.cityId) : null })),
    entities,
    dataSeries: series,
    professions: PROFESSIONS.map((p) => ({ slug: p.slug, name: p.name, group: p.group })),
    tools: TOOLS.map((t) => ({ slug: t.slug, name: t.name, category: t.category, url: toolUrl(t) })),
    authors,
    articleStatuses: ["draft", "research", "editing", "fact_check", "scheduled", "published", "archived"],
  };
});
