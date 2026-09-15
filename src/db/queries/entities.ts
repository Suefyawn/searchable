import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getTool, toolUrl } from "@/tools/registry";

export async function getEntity(slug: string) {
  const db = await getDb();
  return db.query.entities.findFirst({ where: eq(schema.entities.slug, slug) });
}

export async function getEntitiesBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const db = await getDb();
  return db.query.entities.findMany({ where: inArray(schema.entities.slug, slugs) });
}

export async function listEntities(limit = 50) {
  const db = await getDb();
  return db.query.entities.findMany({ orderBy: [schema.entities.name], limit });
}

export type EntityHub = {
  articles: { kind: string; slug: string; title: string; dek: string | null; publishedAt: Date | null; categorySlug: string | null }[];
  tools: { slug: string; name: string; description: string; url: string }[];
  businesses: { slug: string; name: string; cityName: string | null; categoryName: string | null }[];
};

/** Everything linked to an entity, grouped for the hub page. */
export async function entityHub(entityId: string): Promise<EntityHub> {
  const db = await getDb();
  const links = await db.query.entityLinks.findMany({ where: eq(schema.entityLinks.entityId, entityId) });
  const ids = (t: string) => links.filter((l) => l.targetType === t).map((l) => l.targetId);

  const articleIds = ids("article");
  const toolIds = ids("tool");
  const businessIds = ids("business");

  const [articles, tools, businesses] = await Promise.all([
    articleIds.length
      ? db
          .select({
            kind: schema.articles.kind,
            slug: schema.articles.slug,
            title: schema.articles.title,
            dek: schema.articles.dek,
            publishedAt: schema.articles.publishedAt,
            categorySlug: schema.categories.slug,
          })
          .from(schema.articles)
          .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
          .where(and(inArray(schema.articles.id, articleIds), eq(schema.articles.status, "published")))
          .orderBy(desc(schema.articles.publishedAt))
          .limit(20)
      : Promise.resolve([]),
    toolIds.length ? db.query.tools.findMany({ where: inArray(schema.tools.id, toolIds) }) : Promise.resolve([]),
    businessIds.length
      ? db
          .select({ slug: schema.businesses.slug, name: schema.businesses.name, cityName: schema.locations.name, categoryName: schema.businessCategories.name })
          .from(schema.businesses)
          .leftJoin(schema.locations, eq(schema.businesses.cityId, schema.locations.id))
          .leftJoin(schema.businessCategories, eq(schema.businesses.primaryCategoryId, schema.businessCategories.id))
          .where(and(inArray(schema.businesses.id, businessIds), eq(schema.businesses.status, "active")))
          .limit(20)
      : Promise.resolve([]),
  ]);

  return {
    articles,
    tools: tools
      .map((t) => {
        const def = getTool(t.slug);
        return def ? { slug: t.slug, name: t.name, description: t.description, url: toolUrl(def) } : null;
      })
      .filter((t): t is NonNullable<typeof t> => !!t),
    businesses,
  };
}

/** Entities linked FROM a target (e.g. all entities an article mentions). */
export async function entitiesForTarget(targetType: (typeof schema.entityLinkTarget.enumValues)[number], targetId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.entities.id, slug: schema.entities.slug, name: schema.entities.name, kind: schema.entities.kind })
    .from(schema.entityLinks)
    .innerJoin(schema.entities, eq(schema.entityLinks.entityId, schema.entities.id))
    .where(and(eq(schema.entityLinks.targetType, targetType), eq(schema.entityLinks.targetId, targetId)));
  return rows;
}
