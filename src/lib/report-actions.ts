"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const ReportInput = z.object({
  targetType: z.enum(["business", "review", "article"]),
  targetId: z.string().min(1),
  reason: z.enum(["wrong_details", "closed", "duplicate", "inappropriate", "factual_error", "other"]),
  details: z.string().trim().max(1000).optional(),
  email: z.string().trim().max(120).optional(),
});

export async function submitReport(raw: z.infer<typeof ReportInput>): Promise<{ ok: boolean; error?: string }> {
  const rl = await rateLimit("report", 10, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "Too many reports. Please try again later." };
  const parsed = ReportInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please choose a reason." };
  const d = parsed.data;
  const user = await getSessionUser();
  const db = await getDb();
  await db.insert(schema.reports).values({ targetType: d.targetType, targetId: d.targetId, reason: d.reason, details: d.details || null, reporterEmail: d.email || user?.email || null, reporterUserId: user?.id ?? null });
  return { ok: true };
}

export async function resolveReport(id: string, status: "resolved" | "dismissed") {
  await requireRole("editor");
  const db = await getDb();
  await db.update(schema.reports).set({ status, resolvedAt: new Date() }).where(eq(schema.reports.id, id));
  revalidatePath("/admin/reports");
}
