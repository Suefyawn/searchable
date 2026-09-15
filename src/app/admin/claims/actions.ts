"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { approveClaim, rejectClaim } from "@/lib/claims";

export async function decideClaim(formData: FormData) {
  const user = await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || undefined;
  if (!id) return;
  if (decision === "approve") await approveClaim(id, user.id, note ?? "Confirmed by an editor");
  else if (decision === "reject") await rejectClaim(id, user.id, note);
  revalidatePath("/admin/claims");
  revalidatePath("/admin");
}
