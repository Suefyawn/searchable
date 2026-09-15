import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ApiError, withAdminApi } from "@/lib/admin-api";
import { assembleIssue, createIssue, sendIssue, sendTestIssue } from "@/lib/newsletter-issue";

export const dynamic = "force-dynamic";

/** GET /api/admin/newsletter: recent issues and a freshly assembled draft body you can edit before saving. */
export const GET = withAdminApi(async () => {
  const db = await getDb();
  const [issues, draft] = await Promise.all([
    db.query.newsletterIssues.findMany({ orderBy: [desc(schema.newsletterIssues.createdAt)], limit: 20, columns: { id: true, subject: true, frequency: true, status: true, scheduledFor: true, sentAt: true, recipientCount: true, createdAt: true } }),
    assembleIssue("daily"),
  ]);
  return { issues, suggestedDraft: draft };
});

const Body = z.union([
  /** Create an issue: from the automatic assembly (omit subject/body) or with your own markdown. */
  z.object({
    create: z.literal(true),
    frequency: z.enum(["daily", "weekly"]).default("daily"),
    subject: z.string().trim().min(3).max(160).optional(),
    preheader: z.string().trim().max(200).optional(),
    body: z.string().min(10).optional(),
    /** ISO time to send; omit to leave as draft. */
    scheduledFor: z.string().optional(),
  }),
  z.object({ id: z.string().min(1), scheduledFor: z.string().min(1) }),
  z.object({ id: z.string().min(1), sendNow: z.literal(true) }),
  z.object({ id: z.string().min(1), sendTestTo: z.string().email() }),
]);

/**
 * POST /api/admin/newsletter
 *   { create: true, frequency?, subject?, preheader?, body?, scheduledFor? }
 *   { id, scheduledFor }      schedule an existing draft
 *   { id, sendNow: true }     send immediately (budget permitting; large lists resume across days)
 *   { id, sendTestTo }        send a test copy to one address
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  const db = await getDb();
  if ("create" in d) {
    const issue = await createIssue(d.frequency);
    const scheduledFor = d.scheduledFor ? new Date(d.scheduledFor) : null;
    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) throw new ApiError(400, "scheduledFor must be an ISO datetime");
    await db
      .update(schema.newsletterIssues)
      .set({ ...(d.subject ? { subject: d.subject } : {}), ...(d.preheader !== undefined ? { preheader: d.preheader || null } : {}), ...(d.body ? { body: d.body } : {}), status: scheduledFor ? "scheduled" : "draft", scheduledFor })
      .where(eq(schema.newsletterIssues.id, issue.id));
    revalidatePath("/admin/newsletter");
    const saved = await db.query.newsletterIssues.findFirst({ where: eq(schema.newsletterIssues.id, issue.id), columns: { id: true, subject: true, status: true, scheduledFor: true } });
    return { ok: true, issue: saved };
  }
  const issue = await db.query.newsletterIssues.findFirst({ where: eq(schema.newsletterIssues.id, d.id) });
  if (!issue) throw new ApiError(404, "No such issue");
  if ("sendTestTo" in d) {
    await sendTestIssue(d.id, d.sendTestTo);
    return { ok: true, sentTestTo: d.sendTestTo };
  }
  if ("sendNow" in d) {
    if (issue.status === "sent") throw new ApiError(400, "Already sent");
    const r = await sendIssue(d.id);
    revalidatePath("/admin/newsletter");
    return { ok: true, ...r };
  }
  const when = new Date(d.scheduledFor);
  if (Number.isNaN(when.getTime())) throw new ApiError(400, "scheduledFor must be an ISO datetime");
  if (issue.status === "sent") throw new ApiError(400, "Already sent");
  await db.update(schema.newsletterIssues).set({ status: "scheduled", scheduledFor: when }).where(eq(schema.newsletterIssues.id, d.id));
  revalidatePath("/admin/newsletter");
  return { ok: true, id: d.id, scheduledFor: when.toISOString() };
});
