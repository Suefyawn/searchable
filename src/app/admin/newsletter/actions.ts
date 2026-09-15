"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { createIssue, sendIssue, sendTestIssue } from "@/lib/newsletter-issue";

const Freq = z.enum(["daily", "weekly"]);

export async function assembleAction(formData: FormData) {
  await requireRole("editor");
  const frequency = Freq.catch("daily").parse(formData.get("frequency"));
  const row = await createIssue(frequency);
  revalidatePath("/admin/newsletter");
  redirect(`/admin/newsletter/${row.id}`);
}

const Save = z.object({
  id: z.string().min(1),
  subject: z.string().trim().min(3).max(160),
  preheader: z.string().trim().max(200).optional().default(""),
  body: z.string().min(10),
  frequency: Freq,
  scheduledFor: z.string().optional().default(""),
  intent: z.enum(["save", "schedule", "unschedule"]).default("save"),
});

export async function saveIssueAction(formData: FormData) {
  await requireRole("editor");
  const parsed = Save.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const d = parsed.data;
  const db = await getDb();
  const issue = await db.query.newsletterIssues.findFirst({ where: eq(schema.newsletterIssues.id, d.id) });
  if (!issue) return { error: "Issue not found" };
  if (issue.status === "sent") return { error: "Sent issues cannot be edited" };
  const scheduledFor = d.intent === "schedule" && d.scheduledFor ? new Date(d.scheduledFor) : null;
  if (d.intent === "schedule" && (!scheduledFor || Number.isNaN(scheduledFor.getTime()))) return { error: "Pick a valid date and time to schedule" };
  await db
    .update(schema.newsletterIssues)
    .set({ subject: d.subject, preheader: d.preheader || null, body: d.body, frequency: d.frequency, status: d.intent === "schedule" ? "scheduled" : "draft", scheduledFor })
    .where(eq(schema.newsletterIssues.id, d.id));
  revalidatePath("/admin/newsletter");
  revalidatePath(`/admin/newsletter/${d.id}`);
  return { ok: true };
}

export async function sendTestAction(formData: FormData) {
  const user = await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? user.email).trim() || user.email;
  await sendTestIssue(id, to);
  revalidatePath(`/admin/newsletter/${id}`);
  return { ok: true, to };
}

export async function sendNowAction(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (String(formData.get("confirm")) !== "SEND") return { error: "Type SEND to confirm" };
  const result = await sendIssue(id);
  revalidatePath("/admin/newsletter");
  revalidatePath(`/admin/newsletter/${id}`);
  return { ok: true, ...result };
}

export async function deleteIssueAction(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  await db.delete(schema.newsletterIssues).where(eq(schema.newsletterIssues.id, id));
  revalidatePath("/admin/newsletter");
  redirect("/admin/newsletter");
}
