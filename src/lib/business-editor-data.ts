import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { hasRole, type SessionUser } from "@/lib/auth";
import type { BusinessFormInput } from "@/lib/business-schema";

/** Editors/admins can edit any business; owners only their own. */
export async function canEditBusiness(user: SessionUser | null, businessId: string): Promise<boolean> {
  if (!user) return false;
  if (hasRole(user, "editor")) return true;
  const db = await getDb();
  const b = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, businessId), columns: { ownerUserId: true } });
  if (b?.ownerUserId === user.id) return true;
  const claim = await db.query.businessClaims.findFirst({ where: and(eq(schema.businessClaims.businessId, businessId), eq(schema.businessClaims.userId, user.id), eq(schema.businessClaims.status, "approved")), columns: { id: true } });
  return !!claim;
}

/** Loads a business plus the option lists the editor needs. Shared by admin and owner pages. */
export async function loadBusinessEditor(id: string) {
  const db = await getDb();
  const b = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, id), with: { hours: true, photos: { orderBy: [asc(schema.businessPhotos.sortOrder)] }, services: { orderBy: [asc(schema.businessServices.sortOrder)] }, city: true, primaryCategory: true } });
  if (!b) return null;
  const [categories, cities, areas, entities, links] = await Promise.all([
    db.query.businessCategories.findMany({ orderBy: [asc(schema.businessCategories.name)] }),
    db.query.locations.findMany({ where: eq(schema.locations.kind, "city"), orderBy: [asc(schema.locations.name)] }),
    db.query.locations.findMany({ where: eq(schema.locations.kind, "area"), orderBy: [asc(schema.locations.name)] }),
    db.query.entities.findMany({ orderBy: [asc(schema.entities.name)], limit: 200 }),
    db.select({ slug: schema.entities.slug }).from(schema.entityLinks).innerJoin(schema.entities, eq(schema.entityLinks.entityId, schema.entities.id)).where(and(eq(schema.entityLinks.targetType, "business"), eq(schema.entityLinks.targetId, id))),
  ]);
  const initial: BusinessFormInput = {
    id: b.id,
    name: b.name,
    tagline: b.tagline ?? undefined,
    description: b.description ?? undefined,
    primaryCategoryId: b.primaryCategoryId ?? undefined,
    cityId: b.cityId ?? undefined,
    areaId: b.areaId ?? undefined,
    address: b.address ?? undefined,
    phone: b.phone ?? undefined,
    whatsapp: b.whatsapp ?? undefined,
    email: b.email ?? undefined,
    website: b.website ?? undefined,
    facebook: b.social.facebook,
    instagram: b.social.instagram,
    priceRange: b.priceRange ?? undefined,
    logoUrl: b.logoUrl ?? undefined,
    coverUrl: b.coverUrl ?? undefined,
    entitySlugs: links.map((l) => l.slug),
    photos: b.photos.map((p) => ({ url: p.url, alt: p.alt ?? undefined })),
    hours: b.hours.map((h) => ({ dayOfWeek: h.dayOfWeek, opens: h.opens, closes: h.closes, isClosed: h.isClosed })),
    services: b.services.map((s) => ({ name: s.name, description: s.description ?? undefined, priceFrom: s.priceFrom ?? undefined })),
  };
  return {
    business: b,
    initial,
    categories: categories.map((c) => ({ id: c.id, name: c.namePlural ?? c.name })),
    cities: cities.map((c) => ({ id: c.id, name: c.name })),
    areas: areas.map((a) => ({ id: a.id, name: a.name, cityId: a.cityId })),
    entities: entities.map((e) => ({ slug: e.slug, name: e.name })),
  };
}
