"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { indexBusiness } from "@/lib/indexers";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

const ReviewInput = z.object({
  businessId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(20).max(2000),
});

/** Recompute the business's rating aggregate from published reviews. */
async function recomputeRating(businessId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ avg: sql<number>`coalesce(avg(rating), 0)`, n: sql<number>`count(*)` })
    .from(schema.businessReviews)
    .where(and(eq(schema.businessReviews.businessId, businessId), eq(schema.businessReviews.status, "published")));
  await db.update(schema.businesses).set({ ratingAvg: Number(row?.avg ?? 0), ratingCount: row?.n ?? 0 }).where(eq(schema.businesses.id, businessId));
  await indexBusiness(businessId);
}

export async function submitReview(raw: z.infer<typeof ReviewInput>): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to leave a review." };
  const rl = await rateLimit("review", 5, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "Too many reviews in a short time." };
  const parsed = ReviewInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please give a rating and at least a couple of sentences." };
  const d = parsed.data;
  const db = await getDb();
  const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, d.businessId), columns: { id: true, ownerUserId: true, slug: true } });
  if (!business) return { ok: false, error: "Business not found." };
  if (business.ownerUserId === user.id) return { ok: false, error: "Owners cannot review their own business." };
  const existing = await db.query.businessReviews.findFirst({ where: and(eq(schema.businessReviews.businessId, d.businessId), eq(schema.businessReviews.userId, user.id)), columns: { id: true } });
  if (existing) {
    await db.update(schema.businessReviews).set({ rating: d.rating, title: d.title || null, body: d.body, status: "pending" }).where(eq(schema.businessReviews.id, existing.id));
  } else {
    await db.insert(schema.businessReviews).values({ businessId: d.businessId, userId: user.id, authorName: user.name, rating: d.rating, title: d.title || null, body: d.body, status: "pending" });
  }
  await recomputeRating(d.businessId);
  revalidatePath(`/b/${business.slug}`);
  return { ok: true };
}

export async function moderateReview(reviewId: string, status: "published" | "hidden") {
  await requireRole("editor");
  const db = await getDb();
  const r = await db.query.businessReviews.findFirst({ where: eq(schema.businessReviews.id, reviewId), with: { business: { columns: { slug: true } } } });
  if (!r) return;
  await db.update(schema.businessReviews).set({ status }).where(eq(schema.businessReviews.id, reviewId));
  await recomputeRating(r.businessId);
  revalidatePath(`/b/${r.business.slug}`);
  revalidatePath("/admin/reviews");
}

/* ───────────── Professionals ───────────── */

const ProReviewInput = z.object({ professionalId: z.string().min(1), rating: z.number().int().min(1).max(5), title: z.string().trim().max(120).optional(), body: z.string().trim().min(20).max(2000) });

async function recomputeProRating(professionalId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ avg: sql<number>`coalesce(avg(rating), 0)`, n: sql<number>`count(*)` })
    .from(schema.professionalReviews)
    .where(and(eq(schema.professionalReviews.professionalId, professionalId), eq(schema.professionalReviews.status, "published")));
  await db.update(schema.professionals).set({ ratingAvg: Number(row?.avg ?? 0), ratingCount: row?.n ?? 0 }).where(eq(schema.professionals.id, professionalId));
  const { indexProfessional } = await import("@/lib/professionals");
  await indexProfessional(professionalId);
}

export async function submitProfessionalReview(raw: z.infer<typeof ProReviewInput>): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to leave a review." };
  const rl = await rateLimit("review", 5, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "Too many reviews in a short time." };
  const parsed = ProReviewInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please give a rating and at least a couple of sentences." };
  const d = parsed.data;
  const db = await getDb();
  const pro = await db.query.professionals.findFirst({ where: eq(schema.professionals.id, d.professionalId), columns: { id: true, ownerUserId: true, slug: true } });
  if (!pro) return { ok: false, error: "Profile not found." };
  if (pro.ownerUserId === user.id) return { ok: false, error: "You cannot review your own profile." };
  const existing = await db.query.professionalReviews.findFirst({ where: and(eq(schema.professionalReviews.professionalId, d.professionalId), eq(schema.professionalReviews.userId, user.id)), columns: { id: true } });
  if (existing) await db.update(schema.professionalReviews).set({ rating: d.rating, title: d.title || null, body: d.body, status: "pending" }).where(eq(schema.professionalReviews.id, existing.id));
  else await db.insert(schema.professionalReviews).values({ professionalId: d.professionalId, userId: user.id, authorName: user.name, rating: d.rating, title: d.title || null, body: d.body, status: "pending" });
  await recomputeProRating(d.professionalId);
  revalidatePath(`/p/${pro.slug}`);
  return { ok: true };
}

export async function moderateProfessionalReview(reviewId: string, status: "published" | "hidden") {
  await requireRole("editor");
  const db = await getDb();
  const r = await db.query.professionalReviews.findFirst({ where: eq(schema.professionalReviews.id, reviewId), with: { professional: { columns: { slug: true } } } });
  if (!r) return;
  await db.update(schema.professionalReviews).set({ status }).where(eq(schema.professionalReviews.id, reviewId));
  await recomputeProRating(r.professionalId);
  revalidatePath(`/p/${r.professional.slug}`);
  revalidatePath("/admin/reviews");
}

/** The professional answers a published review from the dashboard. */
export async function respondToProfessionalReview(reviewId: string, response: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  const db = await getDb();
  const r = await db.query.professionalReviews.findFirst({ where: eq(schema.professionalReviews.id, reviewId), with: { professional: { columns: { slug: true, ownerUserId: true } } } });
  if (!r) return { ok: false, error: "Review not found" };
  if (!user || r.professional.ownerUserId !== user.id) return { ok: false, error: "Not allowed" };
  const text = response.trim().slice(0, 1000);
  await db.update(schema.professionalReviews).set({ ownerResponse: text || null, ownerRespondedAt: text ? new Date() : null }).where(eq(schema.professionalReviews.id, reviewId));
  revalidatePath(`/p/${r.professional.slug}`);
  revalidatePath("/professional");
  return { ok: true };
}
