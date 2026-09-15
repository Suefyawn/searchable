import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

export async function listProvinces() {
  const db = await getDb();
  return db.query.locations.findMany({ where: eq(schema.locations.kind, "province"), orderBy: [asc(schema.locations.sortOrder), asc(schema.locations.name)] });
}

export async function listCities(opts: { provinceId?: string; limit?: number } = {}) {
  const db = await getDb();
  const conds = [eq(schema.locations.kind, "city")];
  if (opts.provinceId) conds.push(eq(schema.locations.provinceId, opts.provinceId));
  return db.query.locations.findMany({
    where: and(...conds),
    orderBy: [desc(schema.locations.population), asc(schema.locations.name)],
    limit: opts.limit,
  });
}

export async function getCity(slug: string) {
  const db = await getDb();
  return db.query.locations.findFirst({
    where: and(eq(schema.locations.kind, "city"), eq(schema.locations.slug, slug)),
    with: { parent: true, children: { orderBy: [asc(schema.locations.sortOrder), asc(schema.locations.name)] } },
  });
}

export async function getArea(citySlug: string, areaSlug: string) {
  const db = await getDb();
  const city = await getCity(citySlug);
  if (!city) return null;
  const area = await db.query.locations.findFirst({ where: and(eq(schema.locations.kind, "area"), eq(schema.locations.cityId, city.id), eq(schema.locations.slug, areaSlug)) });
  return area ? { city, area } : null;
}

/** Cities with active business counts, for hubs. */
export async function citiesWithCounts(limit = 12) {
  const db = await getDb();
  return db
    .select({
      id: schema.locations.id,
      slug: schema.locations.slug,
      name: schema.locations.name,
      population: schema.locations.population,
      imageUrl: schema.locations.imageUrl,
      imageCredit: schema.locations.imageCredit,
      count: sql<number>`count(${schema.businesses.id})::int`,
    })
    .from(schema.locations)
    .leftJoin(schema.businesses, and(eq(schema.businesses.cityId, schema.locations.id), eq(schema.businesses.status, "active")))
    .where(eq(schema.locations.kind, "city"))
    .groupBy(schema.locations.id)
    .orderBy(desc(sql`count(${schema.businesses.id})`), desc(schema.locations.population))
    .limit(limit);
}
