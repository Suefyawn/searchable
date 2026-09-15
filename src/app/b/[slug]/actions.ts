"use server";

import { z } from "zod";
import { getDb, schema } from "@/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

const Lead = z.object({
  businessId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  message: z.string().trim().min(5).max(1000),
});

export async function sendLead(input: z.infer<typeof Lead>): Promise<{ ok: boolean; error?: string }> {
  const rl = await rateLimit("lead", LIMITS.lead.limit, LIMITS.lead.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many enquiries sent. Please try again later." };
  const parsed = Lead.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fill in your name, phone and message." };
  const db = await getDb();
  await db.insert(schema.businessLeads).values({ ...parsed.data, source: "profile" });
  await db.insert(schema.analyticsEvents).values({ name: "business_lead", props: { businessId: parsed.data.businessId } });
  return { ok: true };
}
