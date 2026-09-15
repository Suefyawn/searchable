import { NextResponse } from "next/server";
import { ingestReceived, verifyResendWebhook } from "@/lib/inbox";

/**
 * Resend webhook. Subscribed to `email.received`: mirrors the new message into the admin inbox straight
 * away (the 5-minute sync in the job runner is the fallback). Signature is checked against
 * RESEND_WEBHOOK_SECRET; without the secret the endpoint refuses everything rather than trusting the network.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyResendWebhook(req.headers, raw)) return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  let event: { type?: string; data?: { email_id?: string; id?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (event.type !== "email.received") return NextResponse.json({ ok: true, ignored: event.type });
  const id = event.data?.email_id ?? event.data?.id;
  if (!id) return NextResponse.json({ error: "No email id" }, { status: 400 });
  try {
    const added = await ingestReceived(id);
    return NextResponse.json({ ok: true, added });
  } catch (e) {
    // 5xx makes Resend retry with backoff, which is what we want for a transient API failure.
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
