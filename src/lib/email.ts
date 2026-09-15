import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type Email = { to: string; subject: string; html: string; text?: string };

/**
 * Email adapter. `EMAIL_PROVIDER=local` writes an .eml file to .data/outbox so you can
 * inspect sends without any account. `resend` uses the Resend API in production.
 */
export async function sendEmail(email: Email): Promise<{ id: string }> {
  const provider = process.env.EMAIL_PROVIDER ?? "local";
  const from = process.env.EMAIL_FROM ?? "Searchable <daily@searchable.pk>";

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({ from, to: email.to, subject: email.subject, html: email.html, text: email.text });
    if (error) throw new Error(error.message);
    return { id: data?.id ?? "" };
  }

  const dir = path.join(process.cwd(), ".data", "outbox");
  mkdirSync(dir, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const file = path.join(dir, `${id}.eml`);
  writeFileSync(
    file,
    `From: ${from}\nTo: ${email.to}\nSubject: ${email.subject}\nDate: ${new Date().toUTCString()}\nContent-Type: text/html; charset=utf-8\n\n${email.html}`,
  );
  console.log(`[email:local] ${email.subject} -> ${email.to}  (${file})`);
  return { id };
}
