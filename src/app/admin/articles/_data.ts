import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { listEntities } from "@/db/queries/entities";
import { listCities } from "@/db/queries/geo";

/** Option lists shared by the new/edit article pages. */
export async function editorOptions() {
  const db = await getDb();
  const [categories, authors, cities, entities, related] = await Promise.all([
    db.query.categories.findMany({ orderBy: [asc(schema.categories.sortOrder)] }),
    db.query.authors.findMany({ orderBy: [asc(schema.authors.name)] }),
    listCities(),
    listEntities(200),
    db.select({ id: schema.articles.id, title: schema.articles.title, kind: schema.articles.kind }).from(schema.articles).where(eq(schema.articles.status, "published")).orderBy(desc(schema.articles.publishedAt)).limit(500),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
    authors: authors.map((a) => ({ id: a.id, name: a.name })),
    cities: cities.map((c) => ({ id: c.id, name: c.name })),
    entities: entities.map((e) => ({ slug: e.slug, name: e.name })),
    related,
  };
}
