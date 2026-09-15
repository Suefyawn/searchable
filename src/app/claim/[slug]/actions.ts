"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { confirmClaimCode, startClaim, type ClaimMethod } from "@/lib/claims";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

const Start = z.object({
  businessId: z.string().min(1),
  slug: z.string().min(1),
  method: z.enum(["invite", "email_domain", "phone", "document"]),
  role: z.enum(["owner", "manager", "staff"]),
  contactName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional(),
  evidenceUrl: z.string().trim().max(500).optional(),
  mailbox: z.string().trim().max(64).optional(),
  inviteToken: z.string().max(400).optional(),
  declaration: z.literal("on", { error: "Confirm the declaration" }),
});

export type ClaimActionState = { error?: string; ok?: boolean; sentTo?: string; status?: string };

export async function startClaimAction(_prev: ClaimActionState, formData: FormData): Promise<ClaimActionState> {
  const user = await requireUser("/business");
  const rl = await rateLimit("claim", LIMITS.claim.limit, LIMITS.claim.windowMs);
  if (!rl.ok) return { error: "Too many attempts. Try again in a few minutes." };
  const parsed = Start.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const d = parsed.data;
  const res = await startClaim({ ...d, method: d.method as ClaimMethod, contactEmail: d.contactEmail || undefined, userId: user.id });
  if ("error" in res) return { error: res.error };
  revalidatePath(`/claim/${d.slug}`);
  revalidatePath(`/b/${d.slug}`);
  return { ok: true, sentTo: res.sentTo, status: res.status };
}

export async function confirmCodeAction(_prev: ClaimActionState, formData: FormData): Promise<ClaimActionState> {
  const user = await requireUser("/business");
  const claimId = String(formData.get("claimId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const code = String(formData.get("code") ?? "");
  const res = await confirmClaimCode(claimId, user.id, code);
  if ("error" in res) return { error: res.error };
  revalidatePath(`/claim/${slug}`);
  revalidatePath(`/b/${slug}`);
  return { ok: true, status: "approved" };
}
