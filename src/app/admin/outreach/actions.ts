"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { eligibleForInvite, renderInvite, sendClaimInvites, setOutreachEnabled } from "@/lib/claims";
import { sendEmail } from "@/lib/email";

export async function toggleOutreach(formData: FormData) {
  await requireRole("admin");
  await setOutreachEnabled(formData.get("enabled") === "1");
  revalidatePath("/admin/outreach");
}

export async function sendBatchNow(formData: FormData) {
  await requireRole("admin");
  const limit = Math.min(100, Math.max(1, Number(formData.get("limit") ?? 20)));
  await sendClaimInvites({ limit, force: true });
  revalidatePath("/admin/outreach");
}

/** Sends the next eligible invite to the editor's own address so the copy can be checked. */
export async function sendPreview(formData: FormData) {
  const user = await requireRole("editor");
  const to = String(formData.get("to") ?? user.email);
  const [b] = await eligibleForInvite(1);
  if (!b || !b.email) return;
  const mail = renderInvite({ ...b, email: b.email });
  await sendEmail({ to, subject: `[PREVIEW] ${mail.subject}`, html: mail.html, text: mail.text });
}
