import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { attachmentDownloadUrl, getInboxMessage } from "@/lib/inbox";

/** Editors only: resolves a short-lived signed URL at Resend and redirects to it. Nothing is proxied through us. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; attachmentId: string }> }) {
  await requireRole("editor", "/admin/inbox");
  const { id, attachmentId } = await ctx.params;
  const m = await getInboxMessage(id);
  if (!m || !m.attachments.some((a) => a.id === attachmentId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = await attachmentDownloadUrl(id, attachmentId).catch(() => null);
  if (!a) return NextResponse.json({ error: "Attachment unavailable" }, { status: 502 });
  return NextResponse.redirect(a.url, 302);
}
