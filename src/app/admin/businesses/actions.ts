"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { indexBusiness } from "@/lib/indexers";

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
