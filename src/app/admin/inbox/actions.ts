"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { EmailBudgetExceeded } from "@/lib/email";
import { replyToInboxMessage, setInboxStatus, syncInbox } from "@/lib/inbox";

function refresh(id?: string) {
  revalidatePath("/admin/inbox");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/inbox/${id}`);
}

export async function syncInboxAction() {
  await requireRole("editor");
  const r = await syncInbox().catch((e: Error) => ({ added: 0, skipped: e.message }));
  refresh();
  redirect(`/admin/inbox?synced=${r.added}${r.skipped ? `&note=${encodeURIComponent(r.skipped)}` : ""}`);
}

export async function setInboxStatusAction(id: string, status: "new" | "replied" | "archived") {
  await requireRole("editor");
  await setInboxStatus(id, status);
  refresh(id);
}

const ReplyInput = z.object({ id: z.string().min(1), body: z.string().trim().min(2, "Write a reply first").max(20_000) });
export type ReplyState = { ok?: boolean; error?: string };

export async function replyAction(_prev: ReplyState, formData: FormData): Promise<ReplyState> {
  const user = await requireRole("editor");
  const parsed = ReplyInput.safeParse({ id: formData.get("id"), body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid reply" };
  try {
    await replyToInboxMessage(parsed.data.id, parsed.data.body, user.name);
  } catch (e) {
    if (e instanceof EmailBudgetExceeded) return { error: e.message };
    return { error: (e as Error).message };
  }
  refresh(parsed.data.id);
  return { ok: true };
}
