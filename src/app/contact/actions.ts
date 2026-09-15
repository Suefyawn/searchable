"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email";

const Msg = z.object({ name: z.string().trim().min(2).max(80), email: z.email(), subject: z.string().trim().min(2).max(120), message: z.string().trim().min(10).max(4000), about: z.string().max(120).optional() });

export async function sendContact(input: z.infer<typeof Msg>): Promise<{ ok: boolean; error?: string }> {
  const parsed = Msg.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please complete every field." };
  const d = parsed.data;
  await sendEmail({
    to: "hello@searchable.pk",
    subject: `[Contact] ${d.subject}${d.about ? ` (about: ${d.about})` : ""}`,
    html: `<p><strong>${d.name}</strong> &lt;${d.email}&gt;</p><p>${d.message.replace(/\n/g, "<br>")}</p>`,
    text: `${d.name} <${d.email}>\n\n${d.message}`,
  });
  return { ok: true };
}
