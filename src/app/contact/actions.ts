"use server";

import { z } from "zod";
import { getDb, schema } from "@/db";
import { sendEmail } from "@/lib/email";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";

const Msg = z.object({ name: z.string().trim().min(2).max(80), email: z.email(), subject: z.string().trim().min(2).max(120), message: z.string().trim().min(10).max(4000), about: z.string().max(120).optional(), turnstile: z.string().optional() });

export async function sendContact(input: z.infer<typeof Msg>): Promise<{ ok: boolean; error?: string }> {
  const rl = await rateLimit("contact", LIMITS.contact.limit, LIMITS.contact.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many messages. Please try again later." };
  const parsed = Msg.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please complete every field." };
  const d = parsed.data;
  if (!(await verifyTurnstile(d.turnstile))) return { ok: false, error: TURNSTILE_ERROR };
  const db = await getDb();
  await db.insert(schema.messages).values({ name: d.name, email: d.email, subject: d.subject, body: d.message, about: d.about ?? null });
  await sendEmail({
    to: "hello@searchable.pk",
    subject: `[Contact] ${d.subject}${d.about ? ` (about: ${d.about})` : ""}`,
    html: `<p><strong>${d.name}</strong> &lt;${d.email}&gt;</p><p>${d.message.replace(/\n/g, "<br>")}</p>`,
    text: `${d.name} <${d.email}>\n\n${d.message}`,
  });
  return { ok: true };
}
