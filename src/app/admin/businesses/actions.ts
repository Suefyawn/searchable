"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { indexBusiness } from "@/lib/indexers";
import { removeSearchDocument } from "@/lib/search";

type Status = (typeof schema.businessStatus.enumValues)[number];

export async function setBusinessStatus(id: string, status: Status) {
  await requireRole("editor");
  const db = await getDb();
  await db.update(schema.businesses).set({ status }).where(eq(schema.businesses.id, id));
  await indexBusiness(id);
  revalidatePath("/businesses");
  revalidatePath("/b/[slug]", "page");
  revalidatePath("/admin/businesses");
}

/** Merge a duplicate into its canonical listing: status → duplicate, permanent redirect, out of search. */
export async function markDuplicateOf(formData: FormData) {
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  const canonicalId = String(formData.get("canonicalId") ?? "");
  if (!id || !canonicalId || id === canonicalId) return;
  const db = await getDb();
  const [dupe, canonical] = await Promise.all([db.query.businesses.findFirst({ where: eq(schema.businesses.id, id), columns: { slug: true, ratingCount: true } }), db.query.businesses.findFirst({ where: eq(schema.businesses.id, canonicalId), columns: { slug: true } })]);
  if (!dupe || !canonical) return;
  await db.update(schema.businesses).set({ status: "duplicate" }).where(eq(schema.businesses.id, id));
  // Reviews, leads and claims follow the canonical listing so nothing a customer wrote is lost.
  await db.update(schema.businessReviews).set({ businessId: canonicalId }).where(eq(schema.businessReviews.businessId, id));
  await db.update(schema.businessLeads).set({ businessId: canonicalId }).where(eq(schema.businessLeads.businessId, id));
  await db.insert(schema.redirects).values({ fromPath: `/b/${dupe.slug}`, toPath: `/b/${canonical.slug}`, statusCode: 301 }).onConflictDoUpdate({ target: schema.redirects.fromPath, set: { toPath: `/b/${canonical.slug}` } });
  await removeSearchDocument("business", id);
  await indexBusiness(canonicalId);
  revalidatePath("/admin/businesses");
  revalidatePath("/b/[slug]", "page");
}

export async function setBusinessVerified(id: string, verified: boolean) {
  await requireRole("editor");
  const db = await getDb();
  await db.update(schema.businesses).set({ isVerified: verified, verifiedAt: verified ? new Date() : null, lastVerifiedAt: verified ? new Date() : undefined, tier: verified ? "verified" : "free" }).where(eq(schema.businesses.id, id));
  await indexBusiness(id);
  revalidatePath("/b/[slug]", "page");
  revalidatePath("/admin/businesses");
}

export async function reviewClaim(claimId: string, status: "approved" | "rejected") {
  const user = await requireRole("editor");
  const db = await getDb();
  const claim = await db.query.businessClaims.findFirst({ where: eq(schema.businessClaims.id, claimId) });
  if (!claim) return;
  await db.update(schema.businessClaims).set({ status, reviewedBy: user.id, reviewedAt: new Date() }).where(eq(schema.businessClaims.id, claimId));
  if (status === "approved") {
    await db.update(schema.businesses).set({ ownerUserId: claim.userId }).where(eq(schema.businesses.id, claim.businessId));
    await db.update(schema.users).set({ role: "business_owner" }).where(eq(schema.users.id, claim.userId));
  }
  revalidatePath("/admin/leads");
}
