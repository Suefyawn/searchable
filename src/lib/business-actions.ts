"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { getSessionUser, hasRole, type SessionUser } from "@/lib/auth";
import { indexBusiness } from "@/lib/indexers";
import { BusinessInput, type BusinessFormInput } from "@/lib/business-schema";

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

export async function saveBusiness(raw: BusinessFormInput): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  const parsed = BusinessInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const d = parsed.data;
  if (!(await canEditBusiness(user, d.id))) return { ok: false, error: "You do not have permission to edit this business." };
  const db = await getDb();
  const website = d.website && !/^https?:\/\//.test(d.website) ? `https://${d.website}` : d.website;

  await db
    .update(schema.businesses)
    .set({
      name: d.name,
      tagline: d.tagline || null,
      description: d.description || null,
      primaryCategoryId: d.primaryCategoryId || null,
      cityId: d.cityId || null,
      areaId: d.areaId || null,
      address: d.address || null,
      phone: d.phone || null,
      whatsapp: d.whatsapp || null,
      email: d.email || null,
      website: website || null,
      social: { facebook: d.facebook || undefined, instagram: d.instagram || undefined },
      priceRange: d.priceRange || null,
      logoUrl: d.logoUrl || null,
      coverUrl: d.coverUrl || null,
    })
    .where(eq(schema.businesses.id, d.id));

  if (d.primaryCategoryId) await db.insert(schema.businessCategoryLinks).values({ businessId: d.id, categoryId: d.primaryCategoryId }).onConflictDoNothing();

  await db.delete(schema.businessPhotos).where(eq(schema.businessPhotos.businessId, d.id));
  if (d.photos.length) await db.insert(schema.businessPhotos).values(d.photos.map((p, i) => ({ businessId: d.id, url: p.url, alt: p.alt ?? null, sortOrder: i })));

  await db.delete(schema.businessHours).where(eq(schema.businessHours.businessId, d.id));
  if (d.hours.length) await db.insert(schema.businessHours).values(d.hours.map((h) => ({ businessId: d.id, ...h })));

  await db.delete(schema.businessServices).where(eq(schema.businessServices.businessId, d.id));
  if (d.services.length) await db.insert(schema.businessServices).values(d.services.map((s, i) => ({ businessId: d.id, name: s.name, description: s.description || null, priceFrom: s.priceFrom ?? null, sortOrder: i })));

  await db.delete(schema.entityLinks).where(and(eq(schema.entityLinks.targetType, "business"), eq(schema.entityLinks.targetId, d.id)));
  if (d.entitySlugs.length) {
    const ents = await db.query.entities.findMany({ where: inArray(schema.entities.slug, d.entitySlugs) });
    if (ents.length) await db.insert(schema.entityLinks).values(ents.map((e) => ({ entityId: e.id, targetType: "business" as const, targetId: d.id, relation: "about" })));
  }

  await indexBusiness(d.id);
  const b = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, d.id), columns: { slug: true } });
  if (b) revalidatePath(`/b/${b.slug}`);
  revalidatePath("/businesses/[category]/[city]", "page");
  revalidatePath("/business");
  return { ok: true };
}

export async function respondToReview(reviewId: string, response: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  const db = await getDb();
  const r = await db.query.businessReviews.findFirst({ where: eq(schema.businessReviews.id, reviewId), with: { business: { columns: { slug: true } } } });
  if (!r) return { ok: false, error: "Review not found" };
  if (!(await canEditBusiness(user, r.businessId))) return { ok: false, error: "Not allowed" };
  const text = response.trim().slice(0, 1000);
  await db.update(schema.businessReviews).set({ ownerResponse: text || null, ownerRespondedAt: text ? new Date() : null }).where(eq(schema.businessReviews.id, reviewId));
  revalidatePath(`/b/${r.business.slug}`);
  revalidatePath("/business");
  return { ok: true };
}
