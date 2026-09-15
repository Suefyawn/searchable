import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ApiError, form, withAdminApi } from "@/lib/admin-api";
import { approveClaim, rejectClaim } from "@/lib/claims";
import { moderateComment, moderateMember, moderatePost } from "@/lib/community-actions";
import { setProfessionalStatus, setProfessionalVerified } from "@/lib/professional-actions";
import { resolveReport } from "@/lib/report-actions";
import { moderateProfessionalReview, moderateReview } from "@/lib/review-actions";
import { setBusinessStatus, setBusinessVerified } from "@/app/admin/businesses/actions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/queue: everything waiting for an editor, with enough text to decide.
 * Pending businesses, claims, professionals, community posts, comments held for review, reviews, open reports,
 * new contact-form messages and new pitches.
 */
export const GET = withAdminApi(async () => {
  const db = await getDb();
  const [businesses, claims, professionals, posts, comments, bizReviews, proReviews, reports, messages, submissions] = await Promise.all([
    db.query.businesses.findMany({ where: eq(schema.businesses.status, "pending"), orderBy: [asc(schema.businesses.createdAt)], limit: 50, columns: { id: true, slug: true, name: true, description: true, phone: true, website: true, address: true, createdAt: true }, with: { city: { columns: { name: true } }, primaryCategory: { columns: { name: true } } } }),
    db.query.businessClaims.findMany({ where: eq(schema.businessClaims.status, "pending"), orderBy: [asc(schema.businessClaims.createdAt)], limit: 50, columns: { id: true, method: true, role: true, contactName: true, contactPhone: true, contactEmail: true, evidenceUrl: true, message: true, createdAt: true }, with: { business: { columns: { slug: true, name: true, phone: true, website: true } }, user: { columns: { name: true, email: true } } } }),
    db.query.professionals.findMany({ where: eq(schema.professionals.status, "pending"), orderBy: [asc(schema.professionals.createdAt)], limit: 50, columns: { id: true, slug: true, name: true, professionSlug: true, headline: true, bio: true, licenceNo: true, phone: true, createdAt: true }, with: { city: { columns: { name: true } } } }),
    db.query.posts.findMany({ where: eq(schema.posts.status, "pending"), orderBy: [asc(schema.posts.createdAt)], limit: 50, columns: { id: true, slug: true, kind: true, title: true, body: true, meta: true, createdAt: true }, with: { author: { columns: { name: true, email: true } } } }),
    db.query.comments.findMany({ where: eq(schema.comments.status, "pending"), orderBy: [asc(schema.comments.createdAt)], limit: 50, columns: { id: true, targetType: true, targetId: true, body: true, createdAt: true }, with: { author: { columns: { name: true } } } }),
    db.query.businessReviews.findMany({ where: eq(schema.businessReviews.status, "pending"), orderBy: [asc(schema.businessReviews.createdAt)], limit: 50, columns: { id: true, rating: true, title: true, body: true, createdAt: true }, with: { business: { columns: { slug: true, name: true } } } }),
    db.query.professionalReviews.findMany({ where: eq(schema.professionalReviews.status, "pending"), orderBy: [asc(schema.professionalReviews.createdAt)], limit: 50, columns: { id: true, rating: true, title: true, body: true, createdAt: true }, with: { professional: { columns: { slug: true, name: true } } } }),
    db.query.reports.findMany({ where: eq(schema.reports.status, "open"), orderBy: [asc(schema.reports.createdAt)], limit: 50 }),
    db.query.messages.findMany({ where: eq(schema.messages.status, "new"), orderBy: [desc(schema.messages.createdAt)], limit: 50 }),
    db.query.submissions.findMany({ where: inArray(schema.submissions.status, ["new", "reviewing"]), orderBy: [desc(schema.submissions.createdAt)], limit: 50 }),
  ]);
  return { businesses, claims, professionals, posts, comments, businessReviews: bizReviews, professionalReviews: proReviews, reports, messages, submissions };
});

const Action = z.object({
  type: z.enum(["business", "claim", "professional", "post", "comment", "member", "business_review", "professional_review", "report", "message", "submission"]),
  id: z.string().min(1),
  action: z.string().min(1),
  note: z.string().max(500).optional(),
});
const Body = z.union([Action, z.object({ actions: z.array(Action).min(1).max(100) })]);

const ALLOWED: Record<z.infer<typeof Action>["type"], string[]> = {
  business: ["approve", "reject", "close", "verify", "unverify"],
  claim: ["approve", "reject"],
  professional: ["approve", "reject", "hide", "verify", "unverify"],
  post: ["approve", "reject", "hide", "verify", "pin"],
  comment: ["approve", "hide", "delete"],
  member: ["ban", "unban", "verify", "unverify"],
  business_review: ["approve", "hide"],
  professional_review: ["approve", "hide"],
  report: ["resolve", "dismiss"],
  message: ["replied", "archive"],
  submission: ["reviewing", "accepted", "rejected"],
};

async function apply(a: z.infer<typeof Action>, userId: string) {
  if (!ALLOWED[a.type].includes(a.action)) throw new ApiError(400, `${a.type}: action must be one of ${ALLOWED[a.type].join(", ")}`);
  const db = await getDb();
  switch (a.type) {
    case "business":
      if (a.action === "verify" || a.action === "unverify") await setBusinessVerified(a.id, a.action === "verify");
      else await setBusinessStatus(a.id, a.action === "approve" ? "active" : a.action === "close" ? "closed" : "rejected");
      return;
    case "claim":
      if (a.action === "approve") await approveClaim(a.id, userId, a.note ?? "Confirmed by an editor");
      else await rejectClaim(a.id, userId, a.note);
      return;
    case "professional":
      if (a.action === "verify" || a.action === "unverify") await setProfessionalVerified(a.id, a.action === "verify");
      else await setProfessionalStatus(a.id, a.action === "approve" ? "active" : a.action === "hide" ? "hidden" : "rejected");
      return;
    case "post":
      await moderatePost(form({ id: a.id, action: a.action, note: a.note }));
      return;
    case "comment":
      await moderateComment(form({ id: a.id, action: a.action }));
      return;
    case "member":
      await moderateMember(form({ userId: a.id, action: a.action }));
      return;
    case "business_review":
      await moderateReview(a.id, a.action === "approve" ? "published" : "hidden");
      return;
    case "professional_review":
      await moderateProfessionalReview(a.id, a.action === "approve" ? "published" : "hidden");
      return;
    case "report":
      await resolveReport(a.id, a.action === "resolve" ? "resolved" : "dismissed");
      return;
    case "message":
      await db.update(schema.messages).set({ status: a.action === "replied" ? "replied" : "archived" }).where(eq(schema.messages.id, a.id));
      return;
    case "submission":
      await db.update(schema.submissions).set({ status: a.action as "reviewing" | "accepted" | "rejected" }).where(eq(schema.submissions.id, a.id));
      return;
  }
}

/**
 * POST /api/admin/queue { type, id, action, note? }  or  { actions: [...] }
 * Types and actions: see ALLOWED above (also listed in docs/ADMIN-API.md).
 */
export const POST = withAdminApi(async (_req, { user, body }) => {
  const d = Body.parse(body);
  const list = "actions" in d ? d.actions : [d];
  const results = [];
  for (const a of list) {
    try {
      await apply(a, user.id);
      results.push({ ...a, ok: true });
    } catch (e) {
      results.push({ ...a, ok: false, error: (e as Error).message });
    }
  }
  return { ok: results.every((r) => r.ok), results };
});
