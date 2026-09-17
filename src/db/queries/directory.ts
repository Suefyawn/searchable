import { cache } from "react";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/db";

export async function listBusinessCategories(opts: { topLevelOnly?: boolean } = {}) {
  const db = await getDb();
  return db.query.businessCategories.findMany({
    where: opts.topLevelOnly ? isNull(schema.businessCategories.parentId) : undefined,
    orderBy: [asc(schema.businessCategories.sortOrder), asc(schema.businessCategories.name)],
  });
}

async function getBusinessCategoryRaw(slug: string) {
  const db = await getDb();
  return db.query.businessCategories.findFirst({ where: eq(schema.businessCategories.slug, slug), with: { children: true, parent: true } });
}

/** Category counts, optionally within a city. Powers hubs and "browse by category". */
export async function categoryCounts(cityId?: string, areaId?: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.businessCategories.id,
      slug: schema.businessCategories.slug,
      name: schema.businessCategories.name,
      namePlural: schema.businessCategories.namePlural,
      icon: schema.businessCategories.icon,
      imageUrl: schema.businessCategories.imageUrl,
      count: sql<number>`count(${schema.businesses.id})::int`,
    })
    .from(schema.businessCategories)
    .leftJoin(
      schema.businesses,
      and(eq(schema.businesses.primaryCategoryId, schema.businessCategories.id), eq(schema.businesses.status, "active"), cityId ? eq(schema.businesses.cityId, cityId) : undefined, areaId ? eq(schema.businesses.areaId, areaId) : undefined),
    )
    .groupBy(schema.businessCategories.id)
    .orderBy(desc(sql`count(${schema.businesses.id})`), asc(schema.businessCategories.name));
  return rows;
}

/** Area counts within a city (optionally for one category). Powers area chips and area hubs. */
export async function areaCounts(cityId: string, categoryId?: string) {
  const db = await getDb();
  return db
    .select({ id: schema.locations.id, slug: schema.locations.slug, name: schema.locations.name, count: sql<number>`count(${schema.businesses.id})::int` })
    .from(schema.locations)
    .innerJoin(schema.businesses, and(eq(schema.businesses.areaId, schema.locations.id), eq(schema.businesses.status, "active"), categoryId ? eq(schema.businesses.primaryCategoryId, categoryId) : undefined))
    .where(and(eq(schema.locations.kind, "area"), eq(schema.locations.cityId, cityId)))
    .groupBy(schema.locations.id)
    .orderBy(desc(sql`count(${schema.businesses.id})`), asc(schema.locations.name));
}

/** City counts for a category. Powers /businesses/[category] "choose a city". */
export async function cityCountsForCategory(categoryId: string) {
  const db = await getDb();
  return db
    .select({
      id: schema.locations.id,
      slug: schema.locations.slug,
      name: schema.locations.name,
      count: sql<number>`count(${schema.businesses.id})::int`,
    })
    .from(schema.businesses)
    .innerJoin(schema.locations, eq(schema.businesses.cityId, schema.locations.id))
    .where(and(eq(schema.businesses.primaryCategoryId, categoryId), eq(schema.businesses.status, "active")))
    .groupBy(schema.locations.id)
    .orderBy(desc(sql`count(${schema.businesses.id})`));
}

export type BusinessCard = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  isVerified: boolean;
  tier: (typeof schema.businessTier.enumValues)[number];
  ratingAvg: number;
  ratingCount: number;
  priceRange: number | null;
  logoUrl: string | null;
  coverUrl: string | null;
  cityName: string | null;
  citySlug: string | null;
  areaName: string | null;
  categoryName: string | null;
  categorySlug: string | null;
};

const area = alias(schema.locations, "area");

const cardSelect = {
  id: schema.businesses.id,
  slug: schema.businesses.slug,
  name: schema.businesses.name,
  tagline: schema.businesses.tagline,
  description: schema.businesses.description,
  address: schema.businesses.address,
  phone: schema.businesses.phone,
  whatsapp: schema.businesses.whatsapp,
  website: schema.businesses.website,
  isVerified: schema.businesses.isVerified,
  tier: schema.businesses.tier,
  ratingAvg: schema.businesses.ratingAvg,
  ratingCount: schema.businesses.ratingCount,
  priceRange: schema.businesses.priceRange,
  logoUrl: schema.businesses.logoUrl,
  coverUrl: schema.businesses.coverUrl,
  cityName: schema.locations.name,
  citySlug: schema.locations.slug,
  areaName: area.name,
  categoryName: schema.businessCategories.name,
  categorySlug: schema.businessCategories.slug,
};

export async function listBusinesses(opts: { categoryId?: string; cityId?: string; areaId?: string; limit?: number; offset?: number; featuredFirst?: boolean } = {}): Promise<BusinessCard[]> {
  const db = await getDb();
  const conds = [eq(schema.businesses.status, "active")];
  if (opts.categoryId) conds.push(eq(schema.businesses.primaryCategoryId, opts.categoryId));
  if (opts.cityId) conds.push(eq(schema.businesses.cityId, opts.cityId));
  if (opts.areaId) conds.push(eq(schema.businesses.areaId, opts.areaId));
  return db
    .select(cardSelect)
    .from(schema.businesses)
    .leftJoin(schema.locations, eq(schema.businesses.cityId, schema.locations.id))
    .leftJoin(area, eq(area.id, schema.businesses.areaId))
    .leftJoin(schema.businessCategories, eq(schema.businesses.primaryCategoryId, schema.businessCategories.id))
    .where(and(...conds))
    .orderBy(
      desc(sql`case ${schema.businesses.tier} when 'sponsored' then 3 when 'premium' then 2 when 'verified' then 1 else 0 end`),
      desc(schema.businesses.isVerified),
      desc(schema.businesses.ratingAvg),
      desc(schema.businesses.ratingCount),
      asc(schema.businesses.name),
    )
    .limit(opts.limit ?? 24)
    .offset(opts.offset ?? 0);
}

export async function countBusinesses(opts: { categoryId?: string; cityId?: string; areaId?: string } = {}) {
  const db = await getDb();
  const conds = [eq(schema.businesses.status, "active")];
  if (opts.categoryId) conds.push(eq(schema.businesses.primaryCategoryId, opts.categoryId));
  if (opts.cityId) conds.push(eq(schema.businesses.cityId, opts.cityId));
  if (opts.areaId) conds.push(eq(schema.businesses.areaId, opts.areaId));
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.businesses).where(and(...conds));
  return row?.n ?? 0;
}

async function getBusinessRaw(slug: string) {
  const db = await getDb();
  return db.query.businesses.findFirst({
    where: eq(schema.businesses.slug, slug),
    with: {
      primaryCategory: true,
      city: true,
      area: true,
      hours: { orderBy: [asc(schema.businessHours.dayOfWeek)] },
      services: { orderBy: [asc(schema.businessServices.sortOrder)] },
      photos: { orderBy: [asc(schema.businessPhotos.sortOrder)] },
      reviews: { where: eq(schema.businessReviews.status, "published"), orderBy: [desc(schema.businessReviews.createdAt)], limit: 20 },
      categories: { with: { category: true } },
    },
  });
}

export async function incrementBusinessViews(id: string) {
  const db = await getDb();
  await db.update(schema.businesses).set({ viewCount: sql`${schema.businesses.viewCount} + 1` }).where(eq(schema.businesses.id, id));
}
/** Memoised per request: generateMetadata and the page body ask for the same rows. */
export const getBusinessCategory = cache(getBusinessCategoryRaw);
export const getBusiness = cache(getBusinessRaw);
